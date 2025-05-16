import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClickFunnelsContact, updateClickFunnelsContact, createCourseEnrollment } from "@/lib/clickfunnels"

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

        // Only process if payment is successful
        if (session.payment_status === "paid") {
          // Extract customer data from session metadata
          const { email, name, phone, productId, productName, membershipLevel, courseId, stripeCustomerId } =
            session.metadata || {}
          console.log(`Customer data: email=${email}, name=${name}, phone=${phone}`)
          console.log(
            `Product data: id=${productId}, name=${productName}, level=${membershipLevel}, courseId=${courseId}`,
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
            } catch (error) {
              console.error("Fout bij het koppelen van betaling aan klant:", error)
            }
          }

          if (email) {
            try {
              // Split name into first and last name
              let firstName = name
              let lastName = ""

              if (name && name.includes(" ")) {
                const nameParts = name.split(" ")
                firstName = nameParts[0]
                lastName = nameParts.slice(1).join(" ")
              }

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
                const updateResult = await updateClickFunnelsContact({
                  email,
                  first_name: firstName,
                  last_name: lastName,
                  phone,
                  tags: [membershipLevel || "basic", "stripe-customer", "paid-customer"],
                  custom_fields: {
                    product_id: productId || "",
                    product_name: productName || "",
                    membership_level: membershipLevel || "basic",
                    payment_amount: formattedAmount,
                    payment_date: paymentDate,
                    payment_method: "Stripe",
                    stripe_session_id: session.id,
                    stripe_customer_id: (customerId as string) || "",
                    source: "webhook_payment",
                  },
                })

                if (updateResult.success) {
                  console.log(`Evotion account bijgewerkt via webhook:`, updateResult.data)
                  contactId = updateResult.contactId
                } else {
                  // Als bijwerken mislukt, maak een nieuw contact aan
                  console.log(`Geen bestaand account gevonden, nieuw Evotion account aanmaken via webhook...`)
                  const createResult = await createClickFunnelsContact({
                    email,
                    first_name: firstName,
                    last_name: lastName,
                    phone,
                    tags: [membershipLevel || "basic", "stripe-customer", "paid-customer"],
                    custom_fields: {
                      product_id: productId || "",
                      product_name: productName || "",
                      membership_level: membershipLevel || "basic",
                      payment_amount: formattedAmount,
                      payment_date: paymentDate,
                      payment_method: "Stripe",
                      stripe_session_id: session.id,
                      stripe_customer_id: (customerId as string) || "",
                      source: "webhook_payment",
                    },
                  })
                  console.log(`Evotion account aangemaakt via webhook:`, createResult)
                  contactId = createResult.data?.id
                }

                // Als er een course ID is en een contact ID, schrijf de klant in voor de cursus
                if (courseId && contactId) {
                  console.log(`Enrolling contact ${contactId} in course ${courseId} via webhook...`)
                  enrollmentResult = await createCourseEnrollment({
                    contact_id: contactId,
                    course_id: Number.parseInt(courseId),
                    origination_source_type: "stripe_webhook",
                    origination_source_id: 1,
                  })

                  if (enrollmentResult.success) {
                    console.log(`Successfully enrolled contact in course via webhook:`, enrollmentResult.data)
                  } else {
                    console.error(`Failed to enroll contact in course via webhook:`, enrollmentResult.error)
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
