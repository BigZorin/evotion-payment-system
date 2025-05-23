"use server"

import { stripe } from "./stripe-server"
import { getClickfunnelsVariant, getClickfunnelsPrice } from "./clickfunnels"
import { formatCurrency } from "./utils"
import { getProductById } from "./products"

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

    // Controleer of Stripe correct is geconfigureerd
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is niet geconfigureerd")
      throw new Error("Stripe is niet correct geconfigureerd. Neem contact op met de beheerder.")
    }

    // Haal de variant op
    const variant = await getClickfunnelsVariant(variantId)
    if (!variant) {
      console.error(`Variant met ID ${variantId} niet gevonden`)
      throw new Error(`Variant met ID ${variantId} niet gevonden`)
    }

    console.log(`Variant found: ${variant.name}`, JSON.stringify(variant, null, 2))

    // Haal de prijs op
    let price = null
    let isSubscription = false
    let isPaymentPlan = false
    let recurringInterval = "month"
    let recurringIntervalCount = 1
    let paymentCount = 0

    if (variant.prices && variant.prices.length > 0) {
      price = variant.prices[0]

      // Bepaal het type betaling
      isPaymentPlan = price.payment_type === "payment_plan"
      isSubscription = price.recurring === true || isPaymentPlan

      if (isSubscription) {
        recurringInterval = price.recurring_interval || "month"
        recurringIntervalCount = price.recurring_interval_count || 1
      }

      // Voor betalingsplannen, haal het aantal betalingen op
      if (isPaymentPlan) {
        paymentCount = price.installments_count || 3 // Standaard 3 betalingen als niet gespecificeerd
        console.log(`Payment plan detected: ${paymentCount} payments`)
      }

      console.log(`Using price from variant.prices:`, JSON.stringify(price, null, 2))
    } else if (variant.price_ids && variant.price_ids.length > 0) {
      // Als de variant wel price_ids heeft maar geen prices array, haal dan de prijzen op
      try {
        const priceId = variant.price_ids[0]
        console.log(`Fetching price with ID ${priceId}`)
        price = await getClickfunnelsPrice(priceId)
        console.log(`Fetched price:`, JSON.stringify(price, null, 2))

        // Bepaal het type betaling
        isPaymentPlan = price.payment_type === "payment_plan"
        isSubscription = price.recurring === true || isPaymentPlan

        if (isSubscription) {
          recurringInterval = price.recurring_interval || "month"
          recurringIntervalCount = price.recurring_interval_count || 1
        }

        // Voor betalingsplannen, haal het aantal betalingen op
        if (isPaymentPlan) {
          paymentCount = price.installments_count || 3 // Standaard 3 betalingen als niet gespecificeerd
          console.log(`Payment plan detected: ${paymentCount} payments`)
        }
      } catch (error) {
        console.error(`Error fetching price for variant ${variant.id}:`, error)
        throw new Error(`Kon de prijs voor variant ${variant.name} niet ophalen: ${error.message}`)
      }
    }

    if (!price) {
      console.error(`Geen prijs gevonden voor variant ${variant.name}`)
      throw new Error(`Geen prijs gevonden voor variant ${variant.name}`)
    }

    console.log(
      `Price found: ${formatCurrency(price.amount)} (${isPaymentPlan ? "payment plan" : isSubscription ? "subscription" : "one-time"})`,
    )

    // Bepaal de success en cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://betalen.evotion-coaching.nl"
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/checkout/${variant.product_id}/variant/${variantId}`

    // Haal het product op om de cursus IDs te krijgen
    let courseIds: string[] = []
    if (variant.product_id) {
      try {
        const product = await getProductById(variant.product_id.toString())
        if (product?.metadata?.clickfunnels_course_ids) {
          try {
            const productCourseIds = JSON.parse(product.metadata.clickfunnels_course_ids)
            if (Array.isArray(productCourseIds)) {
              courseIds = productCourseIds
              console.log(`Found course IDs in product metadata: ${courseIds.join(", ")}`)
            }
          } catch (e) {
            console.error("Error parsing course IDs from product metadata:", e)
          }
        }
      } catch (e) {
        console.error("Error fetching product:", e)
      }
    }

    // Stel de metadata samen
    const metadata: Record<string, string> = {
      variantId: variant.id.toString(),
      variantName: variant.name,
      productId: variant.product_id?.toString() || "",
      email: customerEmail,
      first_name: customerFirstName,
      last_name: customerLastName,
      payment_type: isPaymentPlan ? "payment_plan" : isSubscription ? "subscription" : "one_time",
    }

    // Voeg betalingsplan metadata toe als het een betalingsplan is
    if (isPaymentPlan && paymentCount > 0) {
      metadata.payment_count = paymentCount.toString()
    }

    // Voeg cursus IDs toe aan metadata als ze bestaan
    if (courseIds.length > 0) {
      metadata.clickfunnels_course_ids = JSON.stringify(courseIds)
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
                payment_type: isPaymentPlan ? "payment_plan" : isSubscription ? "subscription" : "one_time",
                payment_count: isPaymentPlan && paymentCount > 0 ? paymentCount.toString() : "",
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
      // Zorg ervoor dat er een factuur wordt gemaakt en verzonden
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      // Zorg ervoor dat de klant een bevestigingsmail krijgt
      receipt_email: customerEmail,
    }

    // Voor betalingsplannen, voeg subscription_data toe om het abonnement automatisch te beëindigen na het aantal betalingen
    if (isPaymentPlan && paymentCount > 0) {
      // Bereken de einddatum op basis van het aantal betalingen
      const endDate = new Date()

      if (recurringInterval === "day") {
        endDate.setDate(endDate.getDate() + recurringIntervalCount * paymentCount)
      } else if (recurringInterval === "week") {
        endDate.setDate(endDate.getDate() + 7 * recurringIntervalCount * paymentCount)
      } else if (recurringInterval === "month") {
        endDate.setMonth(endDate.getMonth() + recurringIntervalCount * paymentCount)
      } else if (recurringInterval === "year") {
        endDate.setFullYear(endDate.getFullYear() + recurringIntervalCount * paymentCount)
      }

      // Voeg subscription_data toe aan de sessie opties
      sessionOptions.subscription_data = {
        metadata: {
          payment_type: "payment_plan",
          payment_count: paymentCount.toString(),
        },
        cancel_at: Math.floor(endDate.getTime() / 1000), // Unix timestamp in seconden
      }

      console.log(`Payment plan will end on: ${endDate.toISOString()}`)
    }

    console.log("Creating Stripe checkout session with options:", JSON.stringify(sessionOptions, null, 2))

    try {
      const session = await stripe.checkout.sessions.create(sessionOptions)
      console.log(`Stripe session created with ID: ${session.id}`)
      return {
        sessionId: session.id,
        isSubscription,
        isPaymentPlan,
        paymentCount: isPaymentPlan ? paymentCount : 0,
      }
    } catch (stripeError: any) {
      console.error("Stripe API error:", stripeError)

      // Gedetailleerde foutafhandeling voor Stripe fouten
      if (stripeError.type === "StripeCardError") {
        throw new Error(`Betaalkaart geweigerd: ${stripeError.message}`)
      } else if (stripeError.type === "StripeInvalidRequestError") {
        throw new Error(`Ongeldige aanvraag bij betalingsverwerker: ${stripeError.message}`)
      } else if (stripeError.type === "StripeAPIError") {
        throw new Error(`Probleem met betalingsverwerker: ${stripeError.message}`)
      } else if (stripeError.type === "StripeConnectionError") {
        throw new Error(`Kon geen verbinding maken met betalingsverwerker: ${stripeError.message}`)
      } else if (stripeError.type === "StripeAuthenticationError") {
        throw new Error(`Authenticatiefout bij betalingsverwerker: ${stripeError.message}`)
      } else if (stripeError.type === "StripeRateLimitError") {
        throw new Error(`Te veel aanvragen naar betalingsverwerker: ${stripeError.message}`)
      } else {
        throw new Error(`Fout bij het aanmaken van de betaalsessie: ${stripeError.message}`)
      }
    }
  } catch (error: any) {
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
