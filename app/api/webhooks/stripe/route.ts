import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { upsertClickFunnelsContact, createCourseEnrollment } from "@/lib/clickfunnels"

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

// Stripe webhook secret for verifying webhook events
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature") as string

    console.log("Webhook received, verifying signature...")

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`Webhook verified: ${event.type}, id: ${event.id}`)
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      try {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Processing checkout session: ${session.id}`)
        console.log(`Payment status: ${session.payment_status}`)
        console.log(`Metadata:`, session.metadata)

        // Log de gebruikte betalingsmethode
        if (session.payment_method_types && session.payment_method_types.length > 0) {
          console.log(`Payment method types: ${session.payment_method_types.join(", ")}`)
        }

        // Als er een payment_intent is, haal deze op om de exacte betalingsmethode te zien
        let paymentMethodType = "unknown"
        if (session.payment_intent) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)
            if (paymentIntent.payment_method) {
              const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string)
              paymentMethodType = paymentMethod.type
              console.log(`Payment method used: ${paymentMethodType}`)
            }
          } catch (error) {
            console.error("Error retrieving payment method:", error)
          }
        }

        // Only process if payment is successful
        if (session.payment_status === "paid") {
          // Extract customer data from session metadata
          const {
            email: metadataEmail,
            first_name: firstName,
            last_name: lastName,
            name,
            phone,
            birth_date: birthDate,
            productId,
            productName,
            membershipLevel,
            courseId,
            kahunasPackage,
            stripeCustomerId,
          } = session.metadata || {}

          // Use customer_email from session or email from metadata
          const email = session.customer_email || metadataEmail

          console.log(`Customer data: email=${email}, name=${name}, phone=${phone}, birthDate=${birthDate}`)
          console.log(
            `Product data: id=${productId}, name=${productName}, level=${membershipLevel}, courseId=${courseId}, kahunasPackage=${kahunasPackage}`,
          )
          console.log(`Stripe customer ID: ${stripeCustomerId || session.customer}`)

          // Zorg ervoor dat de betaling is gekoppeld aan de klant
          const customerId = stripeCustomerId || session.customer
          if (customerId && session.payment_intent) {
            try {
              // Koppel de betaling aan de klant als dat nog niet is gebeurd
              const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)

              if (paymentIntent.customer !== customerId) {
                await stripe.paymentIntents.update(session.payment_intent as string, {
                  customer: customerId as string,
                })
                console.log(`Payment intent ${session.payment_intent} gekoppeld aan klant ${customerId}`)
              }

              // Controleer of er al een factuur is aangemaakt, zo niet, maak er een
              if (session.invoice === null) {
                console.log("Geen factuur gevonden, handmatig een factuur aanmaken...")

                try {
                  // Maak een factuuritem aan
                  const invoiceItem = await stripe.invoiceItems.create({
                    customer: customerId as string,
                    amount: session.amount_total || 0,
                    currency: session.currency || "eur",
                    description: `Betaling voor ${productName || "dienst"}`,
                    metadata: {
                      session_id: session.id,
                      product_id: productId || "",
                      product_name: productName || "",
                      kahunas_package: kahunasPackage || productId || "",
                    },
                  })

                  console.log(`Factuuritem aangemaakt: ${invoiceItem.id}`)

                  // Maak en verstuur de factuur
                  const invoice = await stripe.invoices.create({
                    customer: customerId as string,
                    auto_advance: true, // Automatisch finaliseren en versturen
                    collection_method: "charge_automatically",
                    metadata: {
                      session_id: session.id,
                      product_id: productId || "",
                      product_name: productName || "",
                      kahunas_package: kahunasPackage || productId || "",
                    },
                  })

                  console.log(`Factuur aangemaakt: ${invoice.id}`)

                  // Finaliseer en verstuur de factuur
                  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
                  console.log(`Factuur gefinaliseerd: ${finalizedInvoice.id}, status: ${finalizedInvoice.status}`)

                  if (finalizedInvoice.status === "paid") {
                    // Verstuur de factuur per e-mail
                    await stripe.invoices.sendInvoice(finalizedInvoice.id)
                    console.log(`Factuur verstuurd naar ${email}`)
                  }
                } catch (invoiceError) {
                  console.error("Fout bij het aanmaken van de factuur:", invoiceError)
                }
              } else {
                console.log(`Factuur al aangemaakt: ${session.invoice}`)
              }
            } catch (error) {
              console.error("Fout bij het koppelen van betaling aan klant of aanmaken factuur:", error)
            }
          }

          if (email) {
            try {
              // Get payment amount from session
              const amountTotal = session.amount_total
              const currency = session.currency
              const formattedAmount = amountTotal
                ? new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amountTotal / 100)
                : "onbekend"

              // Get payment date
              const paymentDate = new Date().toISOString()

              // Probeer eerst een bestaand contact bij te werken
              let contactId: number | undefined
              let enrollmentResult: any = { success: false }

              try {
                console.log(`Upserting ClickFunnels contact for email: ${email}`)

                // Check if we have a valid email
                if (!email) {
                  throw new Error("Email is required for upserting a contact")
                }

                const upsertResult = await upsertClickFunnelsContact({
                  email,
                  first_name: firstName || "",
                  last_name: lastName || "",
                  // Explicitly omit phone to prevent the "Phone number has already been taken" error
                  tags: [membershipLevel || "basic", "stripe-customer", "paid-customer"],
                  custom_fields: {
                    product_id: productId || "",
                    product_name: productName || "",
                    membership_level: membershipLevel || "basic",
                    payment_amount: formattedAmount,
                    payment_date: paymentDate,
                    payment_method: paymentMethodType,
                    stripe_session_id: session.id,
                    stripe_customer_id: (customerId as string) || "",
                    birth_date: birthDate || "",
                    kahunas_package: kahunasPackage || productId || "",
                    source: "webhook_payment",
                  },
                })

                if (upsertResult.success) {
                  console.log(`Evotion account upserted via webhook:`, upsertResult.data)
                  contactId = upsertResult.contactId
                } else {
                  console.error(`Failed to upsert ClickFunnels contact via webhook: ${upsertResult.error}`)
                  throw new Error(`Failed to upsert ClickFunnels contact via webhook: ${upsertResult.error}`)
                }

                // Als er een course ID is en een contact ID, schrijf de klant in voor de cursus
                if (courseId && contactId) {
                  console.log(`Enrolling contact ${contactId} in course ${courseId} via webhook...`)

                  // Try multiple times with different approaches if needed
                  let enrollmentSuccess = false
                  let attempts = 0
                  const maxAttempts = 3

                  while (!enrollmentSuccess && attempts < maxAttempts) {
                    attempts++
                    console.log(`Webhook enrollment attempt ${attempts} of ${maxAttempts}`)

                    try {
                      enrollmentResult = await createCourseEnrollment({
                        contact_id: contactId,
                        course_id: courseId,
                        origination_source_type: "stripe_webhook",
                        origination_source_id: 1,
                      })

                      console.log(`Webhook attempt ${attempts} result:`, enrollmentResult)

                      if (enrollmentResult.success) {
                        enrollmentSuccess = true
                        console.log(
                          `Successfully enrolled contact in course via webhook on attempt ${attempts}:`,
                          enrollmentResult.data,
                        )
                        break
                      } else {
                        console.error(
                          `Failed to enroll contact in course via webhook on attempt ${attempts}:`,
                          enrollmentResult.error,
                        )

                        // Wait a bit before retrying
                        await new Promise((resolve) => setTimeout(resolve, 1000))
                      }
                    } catch (enrollError) {
                      console.error(`Error during webhook enrollment attempt ${attempts}:`, enrollError)

                      // Wait a bit before retrying
                      await new Promise((resolve) => setTimeout(resolve, 1000))
                    }
                  }

                  if (!enrollmentSuccess) {
                    console.error(`All ${maxAttempts} webhook enrollment attempts failed`)
                  }
                }
              } catch (error) {
                console.error("Error updating/creating Evotion account or enrollment via webhook:", error)
                // Stuur een 200 OK terug naar Stripe om te voorkomen dat ze blijven proberen
                return NextResponse.json({
                  received: true,
                  warning: "Webhook processed but Evotion account creation or enrollment failed",
                })
              }

              // In de webhook handler, voeg factuurgegevens toe aan ClickFunnels
              if (session.invoice) {
                try {
                  // Haal de factuur op
                  const invoice = await stripe.invoices.retrieve(session.invoice as string)

                  // Voeg factuurgegevens toe aan de custom_fields
                  const customFields = {
                    product_id: productId || "",
                    product_name: productName || "",
                    membership_level: membershipLevel || "basic",
                    payment_amount: formattedAmount,
                    payment_date: paymentDate,
                    payment_method: paymentMethodType,
                    stripe_session_id: session.id,
                    stripe_customer_id: (customerId as string) || "",
                    birth_date: birthDate || "",
                    kahunas_package: kahunasPackage || productId || "",
                    source: "webhook_payment",
                    invoice_id: invoice.id,
                    invoice_number: invoice.number || "",
                    invoice_url: invoice.hosted_invoice_url || "",
                    invoice_pdf: invoice.invoice_pdf || "",
                    invoice_date: new Date(invoice.created * 1000).toISOString(),
                  }

                  // Update het ClickFunnels contact met de factuurgegevens
                  if (contactId) {
                    await upsertClickFunnelsContact({
                      email,
                      custom_fields: customFields,
                    })
                  }
                } catch (invoiceError) {
                  console.error("Fout bij het ophalen van factuurgegevens:", invoiceError)
                }
              }
            } catch (error) {
              // Log de fout maar laat de webhook succesvol voltooien
              console.error(`Error creating Evotion account:`, error)
              // Stuur een 200 OK terug naar Stripe om te voorkomen dat ze blijven proberen
              return NextResponse.json({
                received: true,
                warning: "Webhook processed but Evotion account creation failed",
              })
            }
          } else {
            console.error(`Missing email in session metadata`)
            return NextResponse.json({
              received: true,
              warning: "Webhook processed but email was missing in metadata",
            })
          }
        } else {
          console.log(`Payment not completed yet, status: ${session.payment_status}`)
        }
      } catch (error) {
        console.error("Error processing checkout.session.completed:", error)
        // Stuur een 200 OK terug naar Stripe om te voorkomen dat ze blijven proberen
        return NextResponse.json({
          received: true,
          warning: "Webhook received but processing failed",
        })
      }
    } else if (event.type === "invoice.created" || event.type === "invoice.finalized") {
      // Log invoice events
      const invoice = event.data.object as Stripe.Invoice
      console.log(`Invoice event: ${event.type}, invoice ID: ${invoice.id}, status: ${invoice.status}`)
    } else if (event.type === "invoice.payment_succeeded") {
      // Log successful invoice payment
      const invoice = event.data.object as Stripe.Invoice
      console.log(`Invoice payment succeeded: ${invoice.id}, amount: ${invoice.amount_paid}`)
    } else if (event.type === "invoice.payment_failed") {
      // Log failed invoice payment
      const invoice = event.data.object as Stripe.Invoice
      console.log(`Invoice payment failed: ${invoice.id}, attempt count: ${invoice.attempt_count}`)
    } else {
      console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    // Stuur een 500 error terug zodat Stripe het opnieuw probeert
    return NextResponse.json({ error: "Webhook handler failed", details: String(error) }, { status: 500 })
  }
}

// Configure the webhook route to accept raw body
export const config = {
  api: {
    bodyParser: false,
  },
}
