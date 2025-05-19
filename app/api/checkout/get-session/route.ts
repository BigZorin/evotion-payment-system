import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe-server"

export async function GET(request: NextRequest) {
  try {
    // Haal het session ID op uit de query parameters
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Geen sessie ID opgegeven" }, { status: 400 })
    }

    console.log(`Retrieving Stripe session with ID: ${sessionId}`)

    // Haal de sessie op van Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      return NextResponse.json({ error: "Sessie niet gevonden" }, { status: 404 })
    }

    // Controleer of de sessie een URL heeft
    if (!session.url) {
      return NextResponse.json({ error: "Geen checkout URL beschikbaar voor deze sessie" }, { status: 400 })
    }

    // Stuur de URL terug
    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("Error retrieving Stripe session:", error)
    return NextResponse.json(
      { error: error.message || "Er is een fout opgetreden bij het ophalen van de betaalsessie" },
      { status: 500 },
    )
  }
}
