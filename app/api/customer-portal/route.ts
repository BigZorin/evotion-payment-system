import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe-server"

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json()

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is vereist" }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://betalen.evotion-coaching.nl"

    // Maak een Stripe Customer Portal sessie aan
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("Error creating customer portal session:", error)
    return NextResponse.json(
      { error: error.message || "Er is een fout opgetreden bij het aanmaken van de customer portal sessie" },
      { status: 500 },
    )
  }
}
