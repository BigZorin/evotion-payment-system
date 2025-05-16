import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClickFunnelsContact } from "@/lib/clickfunnels"

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

    let event: Stripe.Event

    // Verify the webhook signature
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`)
        return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
      }
    } else {
      // For development without webhook secret
      event = JSON.parse(body) as Stripe.Event
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // Only process if payment is successful
        if (session.payment_status === "paid") {
          // Extract customer data from session metadata
          const { email, name, phone, productId, productName, membershipLevel } = session.metadata || {}

          if (email) {
            // Create contact in ClickFunnels
            await createClickFunnelsContact({
              email,
              first_name: name?.split(" ")[0],
              last_name: name?.split(" ").slice(1).join(" "),
              phone,
              custom_fields: {
                product_id: productId || "",
                product_name: productName || "",
                membership_level: membershipLevel || "basic",
              },
            })

            console.log(`Successfully created ClickFunnels contact for ${email}`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

// Configure the webhook route to accept raw body
export const config = {
  api: {
    bodyParser: false,
  },
}
