import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe-server"

export async function POST() {
  try {
    // Controleer of Stripe correct is geconfigureerd
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY is niet geconfigureerd in de omgevingsvariabelen" },
        { status: 500 },
      )
    }

    // Bepaal de success en cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/debug/stripe`

    // Maak een test checkout sessie aan
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Test Product",
              description: "Dit is een test product voor debugging",
            },
            unit_amount: 100, // €1,00
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        test: "true",
        debug: "true",
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error: any) {
    console.error("Error creating test checkout session:", error)
    return NextResponse.json({ error: error.message || "Er is een fout opgetreden" }, { status: 500 })
  }
}
