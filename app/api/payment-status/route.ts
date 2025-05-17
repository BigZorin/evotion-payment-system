import { type NextRequest, NextResponse } from "next/server"
// Vervang de import van stripe
import { stripe } from "@/lib/stripe-server"
import { z } from "zod"

// Schema voor validatie van de request body
const statusRequestSchema = z.object({
  sessionId: z.string().min(1, "Session ID is verplicht"),
})

// Cache voor sessie statussen om herhaalde API-aanroepen te voorkomen
const sessionStatusCache = new Map<string, { status: string; timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30 seconden cache

export async function POST(req: NextRequest) {
  try {
    // Request body parsen
    const body = await req.json()

    // Valideer de input met Zod
    const validationResult = statusRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validatiefout",
          details: validationResult.error.format(),
        },
        { status: 400 },
      )
    }

    const { sessionId } = validationResult.data

    // Check cache first
    const now = Date.now()
    const cachedStatus = sessionStatusCache.get(sessionId)
    if (cachedStatus && now - cachedStatus.timestamp < CACHE_TTL) {
      console.log(`Using cached status for session ${sessionId}`)
      return NextResponse.json({ status: cachedStatus.status })
    }

    // Haal de sessie op van Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Sla de status op in de cache
    sessionStatusCache.set(sessionId, { status: session.payment_status, timestamp: now })

    return NextResponse.json({
      status: session.payment_status,
      customerEmail: session.customer_email,
      amount: session.amount_total,
      currency: session.currency,
    })
  } catch (error: any) {
    console.error("Error fetching payment status:", error)

    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json({ error: "Ongeldige sessie ID" }, { status: 400 })
    }

    return NextResponse.json({ error: error.message || "Er is een fout opgetreden" }, { status: 500 })
  }
}
