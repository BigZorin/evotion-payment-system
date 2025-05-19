import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe-server"
import { upsertClickFunnelsContact, getContactByEmail } from "@/lib/clickfunnels"
import { enrollUserInCourses } from "@/lib/actions"

// Deze functie verwerkt Stripe webhook events
export async function POST(req: NextRequest) {
  let event

  try {
    // Haal de signature header op
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "Geen Stripe signature header" }, { status: 400 })
    }

    // Haal de webhook secret op uit de environment variables
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is niet geconfigureerd")
      return NextResponse.json({ error: "Webhook secret is niet geconfigureerd" }, { status: 500 })
    }

    // Haal de request body op als text
    const body = await req.text()

    // Verifieer de signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook signature verificatie mislukt: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Verwerk het event op basis van het type
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

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`Error processing webhook: ${error}`)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Verwerk een voltooide checkout sessie
async function handleCheckoutSessionCompleted(session: any) {
  console.log("Processing checkout.session.completed event")
  console.log("Session:", JSON.stringify(session, null, 2))

  try {
    // Haal de klantgegevens op uit de sessie
    const { customer_email: email, metadata, customer: customerId } = session

    if (!email || !metadata) {
      console.error("Geen email of metadata gevonden in de sessie")
      return
    }

    const {
      first_name: firstName,
      last_name: lastName,
      variantId,
      variantName,
      productId,
      clickfunnels_course_ids: courseIdsJson,
    } = metadata

    // Maak of update het ClickFunnels contact
    const contactResult = await upsertClickFunnelsContact({
      email,
      first_name: firstName,
      last_name: lastName,
      tags: ["stripe-customer", "paid-customer"],
      custom_fields: {
        variant_id: variantId || "",
        variant_name: variantName || "",
        product_id: productId || "",
        payment_date: new Date().toISOString(),
        payment_method: "Stripe",
        stripe_session_id: session.id,
        stripe_customer_id: customerId || "",
      },
    })

    if (!contactResult.success) {
      console.error("Fout bij het aanmaken/updaten van het ClickFunnels contact:", contactResult.error)
      return
    }

    console.log(`Contact aangemaakt/geupdate met ID: ${contactResult.contactId}`)

    // Schrijf de gebruiker in voor cursussen als er course IDs zijn
    if (courseIdsJson && contactResult.contactId) {
      try {
        const courseIds = JSON.parse(courseIdsJson)
        if (Array.isArray(courseIds) && courseIds.length > 0) {
          console.log(`Inschrijven voor cursussen: ${courseIds.join(", ")}`)
          const enrollmentResult = await enrollUserInCourses(contactResult.contactId, courseIds, session.id)
          console.log("Enrollment result:", enrollmentResult)
        }
      } catch (error) {
        console.error("Fout bij het inschrijven voor cursussen:", error)
      }
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
    // Haal de klantgegevens op
    const customer = await stripe.customers.retrieve(subscription.customer)

    // Update het ClickFunnels contact met de abonnementsinformatie
    if (typeof customer !== "string" && customer.email) {
      const contactResult = await getContactByEmail(customer.email)

      if (contactResult.success && contactResult.contactId) {
        // Update het contact met de abonnementsinformatie
        await upsertClickFunnelsContact({
          email: customer.email,
          tags: ["subscription-customer"],
          custom_fields: {
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_start_date: new Date(subscription.start_date * 1000).toISOString(),
            subscription_end_date: subscription.cancel_at
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : null,
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
          },
        })

        console.log(`Contact ${contactResult.contactId} geupdate met informatie over het verwijderde abonnement`)
      }
    }
  } catch (error) {
    console.error("Fout bij het verwerken van customer.subscription.deleted:", error)
  }
}
