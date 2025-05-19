import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe-server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subscriptionId = params.id

    if (!subscriptionId) {
      return NextResponse.json({ error: "Abonnement ID is vereist" }, { status: 400 })
    }

    // Haal het abonnement op om te controleren of het bestaat
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    if (!subscription) {
      return NextResponse.json({ error: "Abonnement niet gevonden" }, { status: 404 })
    }

    // Annuleer het abonnement
    await stripe.subscriptions.cancel(subscriptionId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error cancelling subscription:", error)
    return NextResponse.json(
      {
        error: "Er is een fout opgetreden bij het opzeggen van het abonnement",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
