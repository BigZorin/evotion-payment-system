import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe-server"
import { getContactByEmail } from "@/lib/clickfunnels"
import { formatCurrency } from "@/lib/utils"

export async function POST(request: NextRequest) {
  try {
    // Haal de email uit de request body
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is vereist" }, { status: 400 })
    }

    // Haal het ClickFunnels contact op
    const contactResult = await getContactByEmail(email)

    if (!contactResult.success || !contactResult.contactId) {
      return NextResponse.json({ subscriptions: [] })
    }

    // Haal de Stripe klant op
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      return NextResponse.json({ subscriptions: [] })
    }

    const customer = customers.data[0]

    // Haal de abonnementen op
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      expand: ["data.default_payment_method", "data.items.data.price.product"],
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ subscriptions: [] })
    }

    // Formatteer de abonnementen
    const formattedSubscriptions = subscriptions.data.map((subscription) => {
      // Haal de product en prijs informatie op
      const item = subscription.items.data[0]
      const price = item.price
      const product = price.product as any

      // Bereken de volgende factuurdatum
      const nextBillingDate = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toLocaleDateString("nl-NL")
        : "Onbekend"

      // Bepaal de status
      let status = "Actief"
      let statusColor = "text-green-600"

      if (subscription.status === "canceled") {
        status = "Geannuleerd"
        statusColor = "text-red-600"
      } else if (subscription.status === "past_due") {
        status = "Betaling mislukt"
        statusColor = "text-amber-600"
      } else if (subscription.status === "unpaid") {
        status = "Onbetaald"
        statusColor = "text-amber-600"
      } else if (subscription.status === "trialing") {
        status = "Proefperiode"
        statusColor = "text-blue-600"
      }

      // Bereken de prijs
      const amount = price.unit_amount ? price.unit_amount / 100 : 0
      const formattedAmount = formatCurrency(amount)

      // Bepaal de interval
      const interval = price.recurring?.interval || "month"
      const intervalCount = price.recurring?.interval_count || 1

      let intervalText = "per maand"
      if (interval === "year") {
        intervalText = intervalCount === 1 ? "per jaar" : `elke ${intervalCount} jaar`
      } else if (interval === "month") {
        intervalText = intervalCount === 1 ? "per maand" : `elke ${intervalCount} maanden`
      } else if (interval === "week") {
        intervalText = intervalCount === 1 ? "per week" : `elke ${intervalCount} weken`
      } else if (interval === "day") {
        intervalText = intervalCount === 1 ? "per dag" : `elke ${intervalCount} dagen`
      }

      return {
        id: subscription.id,
        productName: product.name,
        status,
        statusColor,
        amount: formattedAmount,
        intervalText,
        nextBillingDate,
        paymentMethod: subscription.default_payment_method
          ? `${(subscription.default_payment_method as any).card?.brand} **** ${
              (subscription.default_payment_method as any).card?.last4
            }`
          : "Onbekend",
        isActive: subscription.status === "active",
      }
    })

    return NextResponse.json({ subscriptions: formattedSubscriptions })
  } catch (error) {
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de abonnementen" },
      { status: 500 },
    )
  }
}
