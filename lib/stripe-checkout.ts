"use server"

import { stripe } from "./stripe-server"
import { getClickfunnelsVariant, getClickfunnelsPrice } from "./clickfunnels"
import { formatCurrency } from "./utils"

interface CreateCheckoutSessionParams {
  variantId: string
  customerEmail: string
  customerFirstName: string
  customerLastName: string
  customerPhone?: string
  customerBirthDate?: string
  companyDetails?: {
    name: string
    vatNumber?: string
    address?: string
    postalCode?: string
    city?: string
  }
}

export async function createStripeCheckoutSession({
  variantId,
  customerEmail,
  customerFirstName,
  customerLastName,
  customerPhone,
  customerBirthDate,
  companyDetails,
}: CreateCheckoutSessionParams) {
  try {
    console.log(`Creating Stripe checkout session for variant ${variantId} and customer ${customerEmail}`)

    // Haal de variant op
    const variant = await getClickfunnelsVariant(variantId)
    if (!variant) {
      throw new Error(`Variant met ID ${variantId} niet gevonden`)
    }

    console.log(`Variant found: ${variant.name}`)

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
    } else if (variant.price_ids && variant.price_ids.length > 0) {
      // Als de variant wel price_ids heeft maar geen prices array, haal dan de prijzen op
      try {
        const priceId = variant.price_ids[0]
        price = await getClickfunnelsPrice(priceId)
        isSubscription = price.recurring === true
        if (isSubscription) {
          recurringInterval = price.recurring_interval || "month"
          recurringIntervalCount = price.recurring_interval_count || 1
        }
      } catch (error) {
        console.error(`Error fetching price for variant ${variant.id}:`, error)
        throw new Error(`Kon de prijs voor variant ${variant.name} niet ophalen`)
      }
    }

    if (!price) {
      throw new Error(`Geen prijs gevonden voor variant ${variant.name}`)
    }

    console.log(`Price found: ${formatCurrency(price.amount)} (${isSubscription ? "subscription" : "one-time"})`)

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
    const amountInCents = Math.round(price.amount * 100)

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

    const session = await stripe.checkout.sessions.create(sessionOptions)
    console.log(`Stripe session created with ID: ${session.id}`)

    return { sessionId: session.id, isSubscription }
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error)
    throw error
  }
}

// Functie om een Stripe Customer Portal sessie aan te maken
export async function createCustomerPortalSession(customerId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://betalen.evotion-coaching.nl"
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}`,
    })
    return { url: portalSession.url }
  } catch (error) {
    console.error("Error creating customer portal session:", error)
    throw error
  }
}
