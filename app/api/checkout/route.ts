// Verbeter de error handling en voeg rate limiting toe
import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getClickFunnelsProducts } from "@/lib/admin"
import { z } from "zod" // Importeer zod voor validatie

// Schema voor validatie van de request body
const checkoutSchema = z.object({
  productId: z.string().min(1, "Product ID is verplicht"),
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

// Cache voor producten om herhaalde API-aanroepen te voorkomen
let productsCache: any[] = []
let productsCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minuten cache

// Eenvoudige rate limiting implementatie
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minuut
const MAX_REQUESTS_PER_WINDOW = 10 // 10 requests per minuut
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>()

// Functie om producten op te halen met caching
async function getProductsWithCache() {
  const now = Date.now()
  if (productsCache.length === 0 || now - productsCacheTime > CACHE_TTL) {
    console.log("Cache miss: Fetching products from API")
    productsCache = await getClickFunnelsProducts()
    productsCacheTime = now
  } else {
    console.log("Cache hit: Using cached products")
  }
  return productsCache
}

export async function POST(req: NextRequest) {
  try {
    // Performance meting starten
    const startTime = performance.now()

    // Basis rate limiting implementatie
    const ip = req.ip || "unknown"
    const now = Date.now()

    // Controleer en update rate limiting
    const ipData = ipRequestCounts.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW }

    // Reset counter als de window is verlopen
    if (now > ipData.resetTime) {
      ipData.count = 0
      ipData.resetTime = now + RATE_LIMIT_WINDOW
    }

    ipData.count++
    ipRequestCounts.set(ip, ipData)

    // Controleer of rate limit is overschreden
    if (ipData.count > MAX_REQUESTS_PER_WINDOW) {
      console.warn(`Rate limit exceeded for IP: ${ip}`)
      return NextResponse.json(
        { error: "Te veel aanvragen. Probeer het later opnieuw." },
        {
          status: 429,
          headers: {
            "Retry-After": `${Math.ceil((ipData.resetTime - now) / 1000)}`,
          },
        },
      )
    }

    // Request body parsen
    const body = await req.json()
    console.log("Received checkout request:", JSON.stringify(body, null, 2))

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
      productId,
      customerEmail,
      customerFirstName,
      customerLastName,
      customerPhone,
      customerBirthDate,
      companyDetails,
    } = validationResult.data

    // Haal producten op met caching
    const clickfunnelsProducts = await getProductsWithCache()
    console.log(`Fetched ${clickfunnelsProducts.length} products from cache/API`)

    // Filter op niet-gearchiveerde producten
    const activeProducts = clickfunnelsProducts.filter((product) => product.archived !== true)
    console.log(`Found ${activeProducts.length} active products`)

    // Zoek het product op basis van ID of public_id
    let targetProduct = activeProducts.find(
      (p) => p.public_id === productId || p.id.toString() === productId || `cf-${p.id}` === productId,
    )

    // Speciale behandeling voor producten op basis van naam
    if (!targetProduct) {
      console.log(`Product with ID ${productId} not found, trying to find by name or slug`)

      // Controleer of productId een slug is (bijv. "online-coaching")
      if (productId.includes("-")) {
        const slugParts = productId.split("-")
        // Zoek producten die alle delen van de slug in hun naam hebben
        const possibleProducts = activeProducts.filter((p) => {
          const name = p.name.toLowerCase()
          return slugParts.every((part) => name.includes(part.toLowerCase()))
        })

        if (possibleProducts.length > 0) {
          console.log(`Found ${possibleProducts.length} products matching slug ${productId}`)
          targetProduct = possibleProducts[0] // Neem de eerste match
        }
      }

      // Specifieke gevallen
      if (!targetProduct && productId === "12-weken-vetverlies") {
        console.log("Looking for 12-weken-vetverlies product")
        targetProduct = activeProducts.find((p) => p.name.toLowerCase().includes("12-weken vetverlies"))
      }

      if (!targetProduct && (productId === "online-coaching" || productId.includes("coaching"))) {
        console.log("Looking for online coaching product")
        targetProduct = activeProducts.find((p) => p.name.toLowerCase().includes("coaching"))
      }
    }

    if (!targetProduct) {
      console.log(`Product with ID ${productId} not found after all attempts`)
      return NextResponse.json({ error: `Product met ID ${productId} niet gevonden` }, { status: 404 })
    }

    console.log(`Found product: ${targetProduct.name} (ID: ${targetProduct.id})`)

    // Bepaal de prijs
    let amount = 0
    let currency = "eur"
    let isRecurring = false
    let recurringInterval = "month"
    let recurringIntervalCount = 1

    if (targetProduct.defaultPrice) {
      amount = targetProduct.defaultPrice.amount
      currency = targetProduct.defaultPrice.currency || "eur"
      isRecurring = targetProduct.defaultPrice.recurring || false
      if (isRecurring) {
        recurringInterval = targetProduct.defaultPrice.recurring_interval || "month"
        recurringIntervalCount = targetProduct.defaultPrice.recurring_interval_count || 1
      }
    } else if (targetProduct.prices && targetProduct.prices.length > 0) {
      amount = targetProduct.prices[0].amount
      currency = targetProduct.prices[0].currency || "eur"
      isRecurring = targetProduct.prices[0].recurring || false
      if (isRecurring) {
        recurringInterval = targetProduct.prices[0].recurring_interval || "month"
        recurringIntervalCount = targetProduct.prices[0].recurring_interval_count || 1
      }
    } else {
      // Fallback prijs als er geen prijsinformatie beschikbaar is
      console.log("No price information found, using fallback price")
      amount = 5000 // €50,00
    }

    // Controleer of het bedrag in centen of euro's is
    // Als het bedrag kleiner is dan 10, gaan we ervan uit dat het in euro's is en vermenigvuldigen we met 100
    const amountInCents = amount < 10 ? Math.round(amount * 100) : Math.round(amount)
    console.log(`Original amount: ${amount}, Amount in cents for Stripe: ${amountInCents}`)

    // Bepaal de success en cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://betalen.evotion-coaching.nl"
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/checkout/${productId}`

    // Stel de metadata samen
    const metadata: Record<string, string> = {
      productId: targetProduct.id.toString(),
      productName: targetProduct.name,
      email: customerEmail,
      first_name: customerFirstName,
      last_name: customerLastName,
      enrollment_handled_by: "success_page",
    }

    // Voeg optionele velden toe aan metadata als ze bestaan
    if (customerPhone) metadata.phone = customerPhone
    if (customerBirthDate) metadata.birth_date = customerBirthDate

    // Voeg ClickFunnels specifieke metadata toe
    metadata.clickfunnels_product_id = targetProduct.id.toString()
    if (targetProduct.public_id) metadata.clickfunnels_public_id = targetProduct.public_id
    if (targetProduct.default_variant_id) metadata.clickfunnels_variant_id = targetProduct.default_variant_id.toString()

    // Voeg cursus IDs toe als ze beschikbaar zijn
    if (targetProduct.name.toLowerCase().includes("12-weken vetverlies")) {
      metadata.clickfunnels_course_ids = JSON.stringify(["eWbLVk", "vgDnxN", "JMaGxK"])
    }

    // Voeg bedrijfsgegevens toe aan metadata als ze bestaan
    if (companyDetails) {
      metadata.company_name = companyDetails.name
      if (companyDetails.vatNumber) metadata.vat_number = companyDetails.vatNumber
      if (companyDetails.address) metadata.company_address = companyDetails.address
      if (companyDetails.postalCode) metadata.company_postal_code = companyDetails.postalCode
      if (companyDetails.city) metadata.company_city = companyDetails.city
    }

    // Maak de checkout sessie aan met timeout
    const sessionOptions: any = {
      payment_method_types: ["card", "ideal"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: targetProduct.name,
              description: targetProduct.description || "",
              metadata: {
                productId: targetProduct.id.toString(),
                clickfunnels_product_id: targetProduct.id.toString(),
              },
            },
            unit_amount: amountInCents, // Gebruik het bedrag in centen
          },
          quantity: 1,
        },
      ],
      mode: isRecurring ? "subscription" : "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata,
      payment_intent_data: isRecurring
        ? undefined
        : {
            metadata, // Dupliceer metadata in payment intent voor webhook toegang
          },
      invoice_creation: {
        enabled: true,
      },
    }

    // Voeg abonnementsgegevens toe indien nodig
    if (isRecurring) {
      sessionOptions.line_items[0].price_data.recurring = {
        interval: recurringInterval,
        interval_count: recurringIntervalCount,
      }

      // Voeg subscription_data toe voor metadata in de subscription
      sessionOptions.subscription_data = {
        metadata, // Dupliceer metadata in subscription voor webhook toegang
      }
    }

    console.log("Creating Stripe checkout session with options:", JSON.stringify(sessionOptions, null, 2))

    const sessionPromise = stripe.checkout.sessions.create(sessionOptions)

    // Voeg timeout toe aan de Stripe API aanroep
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Stripe API timeout")), 10000) // 10 seconden timeout
    })

    // Race tussen de Stripe API aanroep en de timeout
    const session = (await Promise.race([sessionPromise, timeoutPromise])) as any
    console.log(`Stripe session created with ID: ${session.id}`)

    // Performance meting eindigen
    const endTime = performance.now()
    console.log(`Checkout session created in ${Math.round(endTime - startTime)}ms`)

    return NextResponse.json({ sessionId: session.id })
  } catch (error: any) {
    console.error("Error creating checkout session:", error)

    // Gedetailleerde foutafhandeling
    if (error.type === "StripeCardError") {
      return NextResponse.json({ error: "Betaalkaart geweigerd" }, { status: 400 })
    } else if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json({ error: "Ongeldige aanvraag bij betalingsverwerker" }, { status: 400 })
    } else if (error.type === "StripeAPIError") {
      return NextResponse.json({ error: "Probleem met betalingsverwerker" }, { status: 500 })
    } else if (error.type === "StripeConnectionError") {
      return NextResponse.json({ error: "Kon geen verbinding maken met betalingsverwerker" }, { status: 503 })
    } else if (error.type === "StripeAuthenticationError") {
      return NextResponse.json({ error: "Authenticatiefout bij betalingsverwerker" }, { status: 500 })
    } else if (error.type === "StripeRateLimitError") {
      return NextResponse.json({ error: "Te veel aanvragen naar betalingsverwerker" }, { status: 429 })
    } else if (error.message === "Stripe API timeout") {
      return NextResponse.json({ error: "Timeout bij betalingsverwerker" }, { status: 504 })
    }

    return NextResponse.json({ error: error.message || "Er is een fout opgetreden" }, { status: 500 })
  }
}
