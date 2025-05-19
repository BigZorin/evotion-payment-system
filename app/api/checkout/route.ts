import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe-server"
import { getClickfunnelsVariant, getClickfunnelsPrice } from "@/lib/clickfunnels"
import { z } from "zod"

// Schema voor validatie van de request body
const checkoutSchema = z.object({
  variantId: z.string().min(1, "Variant ID is verplicht"),
  customerEmail: z.string().email("Geldig e-mailadres is verplicht"),
  customerFirstName: z.string().min(1, "Voornaam is verplicht"),
  customerLastName: z.string().min(1, "Achternaam is verplicht"),
  customerPhone: z.string().optional(),
  customerBirthDate: z.string().optional(),
  companyDetails: z
    .object({
      name: z.string().min(1, "Bedrijfsnaam is verplicht"),
      vatNumber: z.string().optional(),
      address: z.string().optional(),
      postalCode: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    console.log("Received checkout request")

    // Controleer Stripe configuratie
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is niet geconfigureerd")
      return NextResponse.json(
        { error: "Stripe is niet correct geconfigureerd. Neem contact op met de beheerder." },
        { status: 500 },
      )
    }

    // Request body parsen
    const body = await req.json()
    console.log("Received checkout request body:", JSON.stringify(body, null, 2))

    // Valideer de input met Zod
    const validationResult = checkoutSchema.safeParse(body)
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.format())
      return NextResponse.json(
        {
          error: "Validatiefout",
          details: validationResult.error.format(),
        },
        { status: 400 },
      )
    }

    const {
      variantId,
      customerEmail,
      customerFirstName,
      customerLastName,
      customerPhone,
      customerBirthDate,
      companyDetails,
    } = validationResult.data

    // Haal de variant op
    console.log(`Fetching variant with ID ${variantId}`)
    const variant = await getClickfunnelsVariant(variantId)
    if (!variant) {
      console.error(`Variant with ID ${variantId} not found`)
      return NextResponse.json({ error: `Variant met ID ${variantId} niet gevonden` }, { status: 404 })
    }

    console.log(`Found variant: ${variant.name} (ID: ${variant.id})`)

    // Haal de prijs op
    let price = null
    let isSubscription = false
    let recurringInterval = "month"
    let recurringIntervalCount = 1

    if (variant.prices && variant.prices.length > 0) {
      price = variant.prices[0]
      isSubscription = price.recurring === true
      if (isSubscription) {
        recurringInterval = price.recurring_interval || "month"
        recurringIntervalCount = price.recurring_interval_count || 1
      }
      console.log(`Using price from variant.prices:`, JSON.stringify(price, null, 2))
    } else if (variant.price_ids && variant.price_ids.length > 0) {
      try {
        const priceId = variant.price_ids[0]
        console.log(`Fetching price with ID ${priceId}`)
        price = await getClickfunnelsPrice(priceId)
        console.log(`Fetched price:`, JSON.stringify(price, null, 2))
        isSubscription = price.recurring === true
        if (isSubscription) {
          recurringInterval = price.recurring_interval || "month"
          recurringIntervalCount = price.recurring_interval_count || 1
        }
      } catch (error) {
        console.error(`Error fetching price for variant ${variant.id}:`, error)
        return NextResponse.json({ error: `Kon de prijs voor variant ${variant.name} niet ophalen` }, { status: 500 })
      }
    }

    if (!price) {
      console.error(`No price found for variant ${variant.name}`)
      return NextResponse.json({ error: `Geen prijs gevonden voor variant ${variant.name}` }, { status: 404 })
    }

    console.log(
      `Price found: ${price.amount} ${price.currency || "EUR"} (${isSubscription ? "subscription" : "one-time"})`,
    )

    // Bepaal de success en cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://betalen.evotion-coaching.nl"
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/checkout/${variant.product_id}/variant/${variantId}`

    // Stel de metadata samen
    const metadata: Record<string, string> = {
      variantId: variant.id.toString(),
      variantName: variant.name,
      productId: variant.product_id?.toString() || "",
      email: customerEmail,
      first_name: customerFirstName,
      last_name: customerLastName,
      enrollment_handled_by: "success_page",
    }

    // Voeg optionele velden toe aan metadata als ze bestaan
    if (customerPhone) metadata.phone = customerPhone
    if (customerBirthDate) metadata.birth_date = customerBirthDate

    // Voeg bedrijfsgegevens toe aan metadata als ze bestaan
    if (companyDetails) {
      metadata.company_name = companyDetails.name
      if (companyDetails.vatNumber) metadata.vat_number = companyDetails.vatNumber
      if (companyDetails.address) metadata.company_address = companyDetails.address
      if (companyDetails.postalCode) metadata.company_postal_code = companyDetails.postalCode
      if (companyDetails.city) metadata.company_city = companyDetails.city
    }

    // Bereken het bedrag in centen voor Stripe
    const amountInCents = Math.round(Number.parseFloat(price.amount) * 100)
    console.log(`Original amount: ${price.amount}, Amount in cents for Stripe: ${amountInCents}`)

    // Maak de checkout sessie aan
    const sessionOptions: any = {
      payment_method_types: ["card", "ideal"],
      line_items: [
        {
          price_data: {
            currency: price.currency || "eur",
            product_data: {
              name: variant.name,
              description: variant.description || "",
              metadata: {
                variantId: variant.id.toString(),
                productId: variant.product_id?.toString() || "",
              },
            },
            unit_amount: amountInCents,
            ...(isSubscription
              ? {
                  recurring: {
                    interval: recurringInterval,
                    interval_count: recurringIntervalCount,
                  },
                }
              : {}),
          },
          quantity: 1,
        },
      ],
      mode: isSubscription ? "subscription" : "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata,
      payment_intent_data: isSubscription
        ? undefined
        : {
            metadata, // Dupliceer metadata in payment intent voor webhook toegang
          },
      invoice_creation: {
        enabled: true,
      },
      // Voeg customer portal toe
      billing_address_collection: "auto",
      customer_creation: "always",
      // Zorg ervoor dat klanten hun facturen en abonnementen kunnen beheren
      allow_promotion_codes: true,
    }

    console.log("Creating Stripe checkout session with options:", JSON.stringify(sessionOptions, null, 2))

    try {
      const session = await stripe.checkout.sessions.create(sessionOptions)
      console.log(`Stripe session created with ID: ${session.id}`)
      return NextResponse.json({ sessionId: session.id, isSubscription })
    } catch (stripeError: any) {
      console.error("Stripe API error:", stripeError)

      // Gedetailleerde foutafhandeling voor Stripe fouten
      if (stripeError.type === "StripeCardError") {
        return NextResponse.json({ error: `Betaalkaart geweigerd: ${stripeError.message}` }, { status: 400 })
      } else if (stripeError.type === "StripeInvalidRequestError") {
        return NextResponse.json(
          { error: `Ongeldige aanvraag bij betalingsverwerker: ${stripeError.message}` },
          { status: 400 },
        )
      } else if (stripeError.type === "StripeAPIError") {
        return NextResponse.json({ error: `Probleem met betalingsverwerker: ${stripeError.message}` }, { status: 500 })
      } else if (stripeError.type === "StripeConnectionError") {
        return NextResponse.json(
          { error: `Kon geen verbinding maken met betalingsverwerker: ${stripeError.message}` },
          { status: 503 },
        )
      } else if (stripeError.type === "StripeAuthenticationError") {
        return NextResponse.json(
          { error: `Authenticatiefout bij betalingsverwerker: ${stripeError.message}` },
          { status: 500 },
        )
      } else if (stripeError.type === "StripeRateLimitError") {
        return NextResponse.json(
          { error: `Te veel aanvragen naar betalingsverwerker: ${stripeError.message}` },
          { status: 429 },
        )
      } else {
        return NextResponse.json(
          { error: `Fout bij het aanmaken van de betaalsessie: ${stripeError.message}` },
          { status: 500 },
        )
      }
    }
  } catch (error: any) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: error.message || "Er is een fout opgetreden" }, { status: 500 })
  }
}
