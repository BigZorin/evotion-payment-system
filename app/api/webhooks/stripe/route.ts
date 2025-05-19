import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe-server"
import { upsertClickFunnelsContact, getContactByEmail } from "@/lib/clickfunnels"
import { enrollUserInCourses } from "@/lib/actions"
import { getProductById } from "@/lib/products"

// Constanten voor betere leesbaarheid en onderhoud
const MAX_ENROLLMENT_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000
const WEBHOOK_TIMEOUT_MS = 10000 // 10 seconden timeout voor de hele webhook verwerking

// Deze functie verwerkt Stripe webhook events
export async function POST(req: NextRequest) {
  // Performance meting starten
  const startTime = performance.now()
  console.log("Stripe webhook ontvangen")

  // Implementeer een timeout voor de hele webhook verwerking
  let timeoutId: NodeJS.Timeout | null = null
  const timeoutPromise = new Promise<NextResponse>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.error("⚠️ Webhook processing timed out after", WEBHOOK_TIMEOUT_MS, "ms")
      reject(new Error("Webhook processing timed out"))
    }, WEBHOOK_TIMEOUT_MS)
  })

  try {
    // Haal de signature header op
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
      console.error("⚠️ Missing Stripe signature header")
      return new NextResponse("Webhook Error: Missing signature header", { status: 400 })
    }

    // Haal de webhook secret op uit de environment variables
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is niet geconfigureerd")
      return new NextResponse("Webhook Error: Webhook secret is niet geconfigureerd", { status: 500 })
    }

    // Haal de request body op als text
    const body = await req.text()

    // Verifieer de signature
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`Webhook event type: ${event.type}`)
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verificatie mislukt: ${err.message}`)
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
    }

    // Verwerk het event op basis van het type
    const processingPromise = (async () => {
      try {
        switch (event.type) {
          case "checkout.session.completed":
            await handleCheckoutSessionCompleted(event.data.object)
            break
          case "invoice.paid":
            await handleInvoicePaid(event.data.object)
            break
          case "customer.subscription.created":
            await handleSubscriptionCreated(event.data.object)
            break
          case "customer.subscription.updated":
            await handleSubscriptionUpdated(event.data.object)
            break
          case "customer.subscription.deleted":
            await handleSubscriptionDeleted(event.data.object)
            break
          default:
            console.log(`Unhandled event type: ${event.type}`)
        }

        // Performance meting eindigen
        const endTime = performance.now()
        console.log(`Webhook processed in ${Math.round(endTime - startTime)}ms`)

        return new NextResponse(JSON.stringify({ received: true }))
      } catch (error) {
        console.error(`Error processing webhook: ${error}`)
        return new NextResponse(JSON.stringify({ error: "Internal server error" }), { status: 500 })
      }
    })()

    // Race tussen de verwerking en de timeout
    const response = await Promise.race([processingPromise, timeoutPromise])

    // Clear the timeout if processing completed successfully
    if (timeoutId) clearTimeout(timeoutId)

    return response
  } catch (error) {
    // Clear the timeout if there was an error
    if (timeoutId) clearTimeout(timeoutId)

    console.error("Error processing webhook:", error)

    // Specifieke foutafhandeling voor timeout
    if (error instanceof Error && error.message === "Webhook processing timed out") {
      return new NextResponse(
        JSON.stringify({
          received: true,
          error: "Webhook processing timed out",
          message:
            "The webhook was received but processing took too long. The operation may still complete in the background.",
        }),
        { status: 202 }, // 202 Accepted - we hebben het ontvangen maar niet volledig verwerkt
      )
    }

    return new NextResponse(JSON.stringify({ received: true, error: "Internal server error" }), { status: 500 })
  }
}

// Verwerk een voltooide checkout sessie
async function handleCheckoutSessionCompleted(session: any) {
  console.log("Processing checkout.session.completed event")
  console.log("Session:", JSON.stringify(session, null, 2))

  try {
    // Haal de klantgegevens op uit de sessie
    const { customer_email: email, metadata, customer: customerId } = session

    if (!email) {
      console.error("Geen email gevonden in de sessie")
      return
    }

    console.log(`Customer email: ${email}`)
    console.log(`Metadata:`, metadata)

    // Haal de metadata op
    const {
      first_name: firstName = "",
      last_name: lastName = "",
      variantId = "",
      variantName = "",
      productId = "",
      clickfunnels_course_ids: courseIdsJson,
      phone = "",
      birth_date: birthDate = "",
      payment_type: paymentType = "",
      payment_count: paymentCountStr = "",
    } = metadata || {}

    // Bepaal het type betaling
    const isPaymentPlan = paymentType === "payment_plan"
    const paymentCount = paymentCountStr ? Number.parseInt(paymentCountStr, 10) : 0

    // Controleer of we de inschrijving moeten verwerken
    if (metadata?.enrollment_handled_by === "success_page") {
      console.log(`Enrollment for session ${session.id} is handled by the success page. Skipping webhook enrollment.`)
      return
    }

    // Maak of update het ClickFunnels contact
    console.log(`Creating/updating ClickFunnels contact for email: ${email}`)

    // Bepaal de tags op basis van het type betaling
    const tags = ["stripe-customer", "paid-customer"]
    if (isPaymentPlan) {
      tags.push("payment-plan-customer")
    } else if (session.mode === "subscription") {
      tags.push("subscription-customer")
    } else {
      tags.push("one-time-customer")
    }

    const contactResult = await upsertClickFunnelsContact({
      email,
      first_name: firstName,
      last_name: lastName,
      phone: phone, // Voeg telefoonnummer toe als het beschikbaar is
      tags,
      custom_fields: {
        variant_id: variantId || "",
        variant_name: variantName || "",
        product_id: productId || "",
        payment_date: new Date().toISOString(),
        payment_method: "Stripe",
        stripe_session_id: session.id,
        stripe_customer_id: customerId || "",
        birth_date: birthDate || "",
        payment_type: paymentType || (session.mode === "subscription" ? "subscription" : "one-time"),
        payment_count: paymentCount > 0 ? paymentCount.toString() : "",
        is_payment_plan: isPaymentPlan ? "true" : "false",
      },
    })

    if (!contactResult.success) {
      console.error("Fout bij het aanmaken/updaten van het ClickFunnels contact:", contactResult.error)
      return
    }

    console.log(`Contact aangemaakt/geupdate met ID: ${contactResult.contactId}`)

    // Bepaal de cursus IDs
    let courseIds: string[] = []

    // Probeer courseIds uit JSON te parsen als het beschikbaar is
    if (courseIdsJson) {
      try {
        const parsedCourseIds = JSON.parse(courseIdsJson)
        if (Array.isArray(parsedCourseIds)) {
          courseIds = parsedCourseIds
          console.log(`Parsed course IDs from JSON: ${courseIds.join(", ")}`)
        }
      } catch (e) {
        console.error("Error parsing course IDs from JSON:", e)
      }
    }

    // Als er geen cursus IDs in de metadata staan, probeer ze dan uit het product te halen
    if (courseIds.length === 0 && productId) {
      try {
        const product = await getProductById(productId)
        if (product?.metadata?.clickfunnels_course_ids) {
          try {
            const productCourseIds = JSON.parse(product.metadata.clickfunnels_course_ids)
            if (Array.isArray(productCourseIds)) {
              courseIds = productCourseIds
              console.log(`Found course IDs in product metadata: ${courseIds.join(", ")}`)
            }
          } catch (e) {
            console.error("Error parsing course IDs from product metadata:", e)
          }
        }
      } catch (e) {
        console.error("Error fetching product:", e)
      }
    }

    // Schrijf de gebruiker in voor cursussen als er course IDs zijn
    if (courseIds.length > 0 && contactResult.contactId) {
      console.log(`Enrolling contact ${contactResult.contactId} in courses: ${courseIds.join(", ")}`)

      try {
        // Probeer meerdere keren om de gebruiker in te schrijven voor de cursussen
        let enrollmentSuccess = false
        let attempts = 0

        while (!enrollmentSuccess && attempts < MAX_ENROLLMENT_ATTEMPTS) {
          attempts++
          console.log(`Enrollment attempt ${attempts} of ${MAX_ENROLLMENT_ATTEMPTS}`)

          try {
            const enrollmentResult = await enrollUserInCourses(contactResult.contactId, courseIds, session.id)
            console.log("Enrollment result:", enrollmentResult)

            if (enrollmentResult.success) {
              enrollmentSuccess = true
              console.log(`Successfully enrolled contact in courses on attempt ${attempts}`)
              break
            } else {
              console.error(`Failed to enroll contact in courses on attempt ${attempts}:`, enrollmentResult.error)
              // Wacht voor de volgende poging
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
            }
          } catch (enrollError) {
            console.error(`Error during enrollment attempt ${attempts}:`, enrollError)
            // Wacht voor de volgende poging
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          }
        }

        if (!enrollmentSuccess) {
          console.error(`All ${MAX_ENROLLMENT_ATTEMPTS} enrollment attempts failed`)
        }
      } catch (error) {
        console.error("Fout bij het inschrijven voor cursussen:", error)
      }
    } else {
      console.log(`No courses to enroll in or missing contact ID`)
    }

    // Stuur een factuur per e-mail
    try {
      console.log(`Sending invoice email for session ${session.id}`)

      // Haal de factuur op
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 1,
      })

      if (invoices.data.length > 0) {
        const invoice = invoices.data[0]

        // Stuur de factuur per e-mail
        await stripe.invoices.sendInvoice(invoice.id)
        console.log(`Invoice ${invoice.id} sent to ${email}`)
      } else {
        console.log(`No invoice found for customer ${customerId}`)

        // Als er geen factuur is, maak er dan een aan
        const invoice = await stripe.invoices.create({
          customer: customerId,
          auto_advance: true, // Automatically finalize and pay the invoice
        })

        // Finaliseer de factuur
        await stripe.invoices.finalizeInvoice(invoice.id)

        // Stuur de factuur per e-mail
        await stripe.invoices.sendInvoice(invoice.id)
        console.log(`Created and sent invoice ${invoice.id} to ${email}`)
      }
    } catch (error) {
      console.error("Fout bij het versturen van de factuur:", error)
    }
  } catch (error) {
    console.error("Fout bij het verwerken van checkout.session.completed:", error)
  }
}

// Verwerk een betaalde factuur
async function handleInvoicePaid(invoice: any) {
  console.log("Processing invoice.paid event")
  console.log("Invoice:", JSON.stringify(invoice, null, 2))

  try {
    // Controleer of dit een factuur is voor een abonnement
    if (invoice.subscription) {
      // Haal het abonnement op
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription)

      // Bepaal of dit een betalingsplan is
      const isPaymentPlan = subscription.metadata?.payment_type === "payment_plan"
      const paymentCount = subscription.metadata?.payment_count
        ? Number.parseInt(subscription.metadata.payment_count, 10)
        : 0

      // Haal de huidige betaling op (welke termijn is dit)
      let currentPaymentNumber = 1

      if (isPaymentPlan) {
        // Haal alle facturen op voor dit abonnement om te bepalen welke termijn dit is
        const allInvoices = await stripe.invoices.list({
          subscription: subscription.id,
          status: "paid",
        })

        // De huidige betaling is het aantal betaalde facturen
        currentPaymentNumber = allInvoices.data.length

        console.log(`Payment plan: payment ${currentPaymentNumber} of ${paymentCount}`)

        // Als dit de laatste betaling is, log dit
        if (paymentCount > 0 && currentPaymentNumber >= paymentCount) {
          console.log(`This is the final payment of the payment plan (${currentPaymentNumber}/${paymentCount})`)
        }
      }

      // Haal de klantgegevens op
      const customer = await stripe.customers.retrieve(invoice.customer)

      // Update het ClickFunnels contact met de betaling
      if (typeof customer !== "string" && customer.email) {
        const contactResult = await getContactByEmail(customer.email)

        if (contactResult.success && contactResult.contactId) {
          // Update het contact met de betaalinformatie
          await upsertClickFunnelsContact({
            email: customer.email,
            custom_fields: {
              last_payment_date: new Date().toISOString(),
              subscription_status: subscription.status,
              subscription_id: subscription.id,
              invoice_id: invoice.id,
              invoice_amount: invoice.amount_paid / 100, // Convert from cents to dollars/euros
              invoice_currency: invoice.currency,
              is_payment_plan: isPaymentPlan ? "true" : "false",
              payment_plan_current: isPaymentPlan ? currentPaymentNumber.toString() : "",
              payment_plan_total: isPaymentPlan && paymentCount > 0 ? paymentCount.toString() : "",
              payment_plan_completed:
                isPaymentPlan && paymentCount > 0 && currentPaymentNumber >= paymentCount ? "true" : "false",
            },
          })

          console.log(`Contact ${contactResult.contactId} geupdate met betaalinformatie`)
        }
      }
    }
  } catch (error) {
    console.error("Fout bij het verwerken van invoice.paid:", error)
  }
}

// Verwerk een nieuw abonnement
async function handleSubscriptionCreated(subscription: any) {
  console.log("Processing customer.subscription.created event")
  console.log("Subscription:", JSON.stringify(subscription, null, 2))

  try {
    // Bepaal of dit een betalingsplan is
    const isPaymentPlan = subscription.metadata?.payment_type === "payment_plan"
    const paymentCount = subscription.metadata?.payment_count
      ? Number.parseInt(subscription.metadata.payment_count, 10)
      : 0

    // Bereken de einddatum voor betalingsplannen
    let endDate = null
    if (isPaymentPlan && paymentCount > 0) {
      // Bereken wanneer het betalingsplan eindigt
      const interval = subscription.items.data[0]?.plan?.interval || "month"
      const intervalCount = subscription.items.data[0]?.plan?.interval_count || 1

      endDate = new Date(subscription.start_date * 1000)

      if (interval === "day") {
        endDate.setDate(endDate.getDate() + intervalCount * paymentCount)
      } else if (interval === "week") {
        endDate.setDate(endDate.getDate() + 7 * intervalCount * paymentCount)
      } else if (interval === "month") {
        endDate.setMonth(endDate.getMonth() + intervalCount * paymentCount)
      } else if (interval === "year") {
        endDate.setFullYear(endDate.getFullYear() + intervalCount * paymentCount)
      }

      console.log(`Payment plan will end on: ${endDate.toISOString()}`)
    }

    // Haal de klantgegevens op
    const customer = await stripe.customers.retrieve(subscription.customer)

    // Update het ClickFunnels contact met de abonnementsinformatie
    if (typeof customer !== "string" && customer.email) {
      const contactResult = await getContactByEmail(customer.email)

      if (contactResult.success && contactResult.contactId) {
        // Bepaal de tags op basis van het type abonnement
        const tags = ["subscription-customer"]
        if (isPaymentPlan) {
          tags.push("payment-plan-customer")
        }

        // Update het contact met de abonnementsinformatie
        await upsertClickFunnelsContact({
          email: customer.email,
          tags,
          custom_fields: {
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_start_date: new Date(subscription.start_date * 1000).toISOString(),
            subscription_end_date: subscription.cancel_at
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : endDate
                ? endDate.toISOString()
                : null,
            subscription_interval: subscription.items.data[0]?.plan?.interval || "unknown",
            subscription_amount: subscription.items.data[0]?.plan?.amount
              ? subscription.items.data[0].plan.amount / 100
              : 0,
            subscription_currency: subscription.items.data[0]?.plan?.currency || "unknown",
            is_payment_plan: isPaymentPlan ? "true" : "false",
            payment_plan_total: isPaymentPlan && paymentCount > 0 ? paymentCount.toString() : "",
            payment_plan_current: isPaymentPlan ? "0" : "", // Nog geen betalingen gedaan
          },
        })

        console.log(`Contact ${contactResult.contactId} geupdate met abonnementsinformatie`)
      }
    }
  } catch (error) {
    console.error("Fout bij het verwerken van customer.subscription.created:", error)
  }
}

// Verwerk een bijgewerkt abonnement
async function handleSubscriptionUpdated(subscription: any) {
  console.log("Processing customer.subscription.updated event")
  console.log("Subscription:", JSON.stringify(subscription, null, 2))

  try {
    // Bepaal of dit een betalingsplan is
    const isPaymentPlan = subscription.metadata?.payment_type === "payment_plan"

    // Haal de klantgegevens op
    const customer = await stripe.customers.retrieve(subscription.customer)

    // Update het ClickFunnels contact met de bijgewerkte abonnementsinformatie
    if (typeof customer !== "string" && customer.email) {
      const contactResult = await getContactByEmail(customer.email)

      if (contactResult.success && contactResult.contactId) {
        // Update het contact met de bijgewerkte abonnementsinformatie
        await upsertClickFunnelsContact({
          email: customer.email,
          custom_fields: {
            subscription_status: subscription.status,
            subscription_end_date: subscription.cancel_at
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : null,
            subscription_updated_at: new Date().toISOString(),
            is_payment_plan: isPaymentPlan ? "true" : "false",
          },
        })

        console.log(`Contact ${contactResult.contactId} geupdate met bijgewerkte abonnementsinformatie`)
      }
    }
  } catch (error) {
    console.error("Fout bij het verwerken van customer.subscription.updated:", error)
  }
}

// Verwerk een verwijderd abonnement
async function handleSubscriptionDeleted(subscription: any) {
  console.log("Processing customer.subscription.deleted event")
  console.log("Subscription:", JSON.stringify(subscription, null, 2))

  try {
    // Bepaal of dit een betalingsplan is
    const isPaymentPlan = subscription.metadata?.payment_type === "payment_plan"
    const paymentCount = subscription.metadata?.payment_count
      ? Number.parseInt(subscription.metadata.payment_count, 10)
      : 0

    // Bepaal of het betalingsplan voltooid is of voortijdig beëindigd
    let paymentPlanCompleted = false

    if (isPaymentPlan && paymentCount > 0) {
      // Haal alle facturen op voor dit abonnement om te bepalen hoeveel termijnen zijn betaald
      const allInvoices = await stripe.invoices.list({
        subscription: subscription.id,
        status: "paid",
      })

      // Het betalingsplan is voltooid als het aantal betaalde facturen gelijk is aan het aantal termijnen
      paymentPlanCompleted = allInvoices.data.length >= paymentCount

      console.log(
        `Payment plan completed: ${paymentPlanCompleted} (${allInvoices.data.length}/${paymentCount} payments)`,
      )
    }

    // Haal de klantgegevens op
    const customer = await stripe.customers.retrieve(subscription.customer)

    // Update het ClickFunnels contact met de informatie over het verwijderde abonnement
    if (typeof customer !== "string" && customer.email) {
      const contactResult = await getContactByEmail(customer.email)

      if (contactResult.success && contactResult.contactId) {
        // Update het contact met de informatie over het verwijderde abonnement
        await upsertClickFunnelsContact({
          email: customer.email,
          custom_fields: {
            subscription_status: "canceled",
            subscription_end_date: new Date().toISOString(),
            subscription_canceled_at: new Date().toISOString(),
            is_payment_plan: isPaymentPlan ? "true" : "false",
            payment_plan_completed: isPaymentPlan ? (paymentPlanCompleted ? "true" : "false") : "",
          },
        })

        console.log(`Contact ${contactResult.contactId} geupdate met informatie over het verwijderde abonnement`)
      }
    }
  } catch (error) {
    console.error("Fout bij het verwerken van customer.subscription.deleted:", error)
  }
}
