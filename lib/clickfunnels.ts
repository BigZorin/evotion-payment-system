"use server"

import { fetchWithRateLimiting } from "./api-helpers"
import { CLICKFUNNELS_API_TOKEN, CLICKFUNNELS_SUBDOMAIN } from "./config"
import { apiCache } from "./cache"
import type { ClickFunnelsContact } from "./types"

// Deze waarden moeten worden ingesteld als omgevingsvariabelen
const CLICKFUNNELS_SUBDOMAIN_OLD = process.env.CLICKFUNNELS_SUBDOMAIN || "myworkspace" // Vervang met je subdomain
const CLICKFUNNELS_WORKSPACE_ID = process.env.CLICKFUNNELS_WORKSPACE_ID || "" // Vervang met je workspace ID
const API_TOKEN = process.env.CLICKFUNNELS_API_TOKEN
const CLICKFUNNELS_ACCOUNT_ID = process.env.CLICKFUNNELS_ACCOUNT_ID || ""

// Constanten voor betere leesbaarheid en onderhoud
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// Betaaltype enum voor betere type veiligheid
export enum PaymentType {
  OneTime = "one_time",
  Subscription = "subscription",
  PaymentPlan = "payment_plan",
}

export interface ClickfunnelsProduct {
  id: number
  public_id: string | null
  name: string
  description: string
  current_path: string | null
  archived: boolean | null
  visible_in_store: boolean | null
  visible_in_customer_center: boolean | null
  image_id: string | null
  seo_title: string | null
  seo_description: string | null
  default_variant_id: number
  created_at: string | null
  updated_at: string | null
  variant_properties: Array<{
    id: number
    name: string
  }> | null
  price_ids: number[] | null
  variant_ids: string[]
  // Toegevoegde velden voor prijsinformatie
  variant?: ClickfunnelsVariant
  variants?: ClickfunnelsVariant[]
  prices?: ClickfunnelsPrice[]
  defaultPrice?: ClickfunnelsPrice
}

export interface ClickfunnelsVariant {
  id: number
  public_id?: string
  product_id?: number
  name: string
  description: string | null
  sku: string | null
  price_ids: string[] | null
  prices?: ClickfunnelsPrice[]
  archived?: boolean
  deleted?: boolean
  properties_values?: {
    property_id: number
    value: string
  }[]
  // ... other properties
}

// Voeg extra velden toe aan de ClickfunnelsPrice interface voor betalingsplannen
export interface ClickfunnelsPrice {
  id: number
  public_id?: string
  variant_id?: number
  amount: number
  currency: string
  payment_type: PaymentType | string // Gebruik het payment_type veld om het type betaling te bepalen
  recurring: boolean
  recurring_interval?: string
  recurring_interval_count?: number
  archived?: boolean
  deleted?: boolean
  // Velden voor betalingsplannen
  installments_count?: number
  installment_amount?: number
  installment_period?: string
  // ... other properties
}

// Functie om alle producten op te halen uit ClickFunnels
export async function getClickfunnelsProducts(): Promise<ClickfunnelsProduct[]> {
  try {
    if (!CLICKFUNNELS_API_TOKEN || !CLICKFUNNELS_SUBDOMAIN) {
      throw new Error("ClickFunnels API token of subdomain ontbreekt")
    }

    // Gebruik fetchWithRateLimiting voor betere foutafhandeling en rate limiting
    const data = await fetchWithRateLimiting<ClickfunnelsProduct[]>(
      `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products`,
      {
        headers: {
          Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
          Accept: "application/json",
        },
      },
      "clickfunnels_products", // Cache key
      5 * 60 * 1000, // 5 minuten cache TTL
    )

    return data
  } catch (error) {
    console.error("Error fetching ClickFunnels products:", error)
    throw error
  }
}

// Functie om een product op te halen uit ClickFunnels
export async function getClickFunnelsProduct(id: string): Promise<ClickfunnelsProduct> {
  try {
    if (!CLICKFUNNELS_API_TOKEN || !CLICKFUNNELS_SUBDOMAIN) {
      throw new Error("ClickFunnels API token of subdomain ontbreekt")
    }

    // Gebruik fetchWithRateLimiting voor betere foutafhandeling en rate limiting
    const data = await fetchWithRateLimiting<ClickfunnelsProduct>(
      `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/${id}`,
      {
        headers: {
          Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
          Accept: "application/json",
        },
      },
      `clickfunnels_product_${id}`, // Cache key
      5 * 60 * 1000, // 5 minuten cache TTL
    )

    return data
  } catch (error) {
    console.error(`Error fetching ClickFunnels product ${id}:`, error)
    throw error
  }
}

// Voeg deze functie toe of update de bestaande functie om de variant op te halen

export async function getClickfunnelsVariant(variantId: string) {
  console.log(`Fetching variant with ID: ${variantId}`)

  try {
    // Controleer eerst of het een public_id is (string met letters en cijfers)
    // of een numerieke ID (alleen cijfers)
    const isPublicId = /[a-zA-Z]/.test(variantId)

    let endpoint
    if (isPublicId) {
      endpoint = `https://${process.env.CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/variants/${variantId}`
    } else {
      // Als het een numerieke ID is, gebruik dan de numerieke endpoint
      endpoint = `https://${process.env.CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/variants/${variantId}`
    }

    console.log(`Fetching variant from endpoint: ${endpoint}`)

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${process.env.CLICKFUNNELS_API_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`Error fetching variant: ${response.status} ${response.statusText}`)
      return null
    }

    const variant = await response.json()

    // Haal de prijzen op voor de variant als ze nog niet zijn opgehaald
    if (
      variant &&
      (!variant.prices || variant.prices.length === 0) &&
      variant.price_ids &&
      variant.price_ids.length > 0
    ) {
      console.log(`Fetching prices for variant ${variant.id}`)

      const prices = await Promise.all(
        variant.price_ids.map(async (priceId: string) => {
          try {
            const priceResponse = await fetch(
              `https://${process.env.CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/prices/${priceId}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.CLICKFUNNELS_API_TOKEN}`,
                  Accept: "application/json",
                },
                cache: "no-store",
              },
            )

            if (!priceResponse.ok) {
              console.error(`Error fetching price ${priceId}: ${priceResponse.status} ${priceResponse.statusText}`)
              return null
            }

            return await priceResponse.json()
          } catch (error) {
            console.error(`Error fetching price ${priceId}:`, error)
            return null
          }
        }),
      )

      // Filter out null values and add prices to variant
      variant.prices = prices.filter(Boolean)
    }

    return variant
  } catch (error) {
    console.error(`Error in getClickfunnelsVariant:`, error)
    return null
  }
}

// Verbeter de getClickfunnelsPrice functie om payment_type correct te verwerken
// en zorg ervoor dat archived en deleted velden correct worden doorgegeven

export async function getClickfunnelsPrice(id: string): Promise<ClickfunnelsPrice> {
  try {
    console.log(`Fetching ClickFunnels price with ID: ${id}`)

    if (!CLICKFUNNELS_API_TOKEN || !CLICKFUNNELS_SUBDOMAIN) {
      throw new Error("ClickFunnels API token of subdomain ontbreekt")
    }

    // Gebruik fetchWithRateLimiting voor betere foutafhandeling en rate limiting
    const data = await fetchWithRateLimiting<ClickfunnelsPrice>(
      `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/prices/${id}`,
      {
        headers: {
          Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
          Accept: "application/json",
        },
      },
      `clickfunnels_price_${id}`, // Cache key
      5 * 60 * 1000, // 5 minuten cache TTL
    )

    // Log de volledige prijs data om te zien of payment_type aanwezig is
    console.log(`Successfully fetched price with ID ${id}:`, JSON.stringify(data, null, 2))

    // Bepaal het betaaltype en recurring status
    let paymentType = data.payment_type || PaymentType.OneTime
    let isRecurring = false

    // Als payment_type niet expliciet is ingesteld, probeer het af te leiden
    if (!data.payment_type) {
      if (data.recurring_interval) {
        paymentType = PaymentType.Subscription
        isRecurring = true
      } else if (data.installments_count && data.installments_count > 1) {
        paymentType = PaymentType.PaymentPlan
      }
    } else {
      // Als payment_type wel is ingesteld, gebruik dat om recurring te bepalen
      isRecurring = paymentType === PaymentType.Subscription
    }

    // Zorg ervoor dat we alle prijsinformatie correct doorgeven
    return {
      ...data,
      payment_type: paymentType,
      recurring: isRecurring,
      // Zorg ervoor dat betalingsplan velden aanwezig zijn
      installments_count: data.installments_count || 0,
      installment_amount: data.installment_amount || 0,
      installment_period: data.installment_period || null,
      // Zorg ervoor dat archived en deleted velden correct worden doorgegeven
      archived: data.archived === true, // Zorg ervoor dat dit een boolean is
      deleted: data.deleted === true, // Zorg ervoor dat dit een boolean is
    }
  } catch (error) {
    console.error(`Error fetching ClickFunnels price ${id}:`, error)
    throw error
  }
}

// Functie om een product met varianten en prijzen op te halen
export async function getProductWithVariantsAndPrices(productId: string): Promise<ClickfunnelsProduct> {
  try {
    console.log(`Fetching product with variants and prices for product ID: ${productId}`)

    // Fetch the product
    const product = await getClickFunnelsProduct(productId)
    console.log(`Product fetched:`, JSON.stringify(product, null, 2))

    // Fetch all variants for this product
    console.log(`Fetching variants for product ID: ${productId}`)
    const variantPromises = product.variant_ids.map((variantId) =>
      getClickfunnelsVariant(variantId).catch((err) => {
        console.error(`Error fetching variant ${variantId}:`, err)
        return null
      }),
    )

    const allVariants = (await Promise.all(variantPromises)).filter((v) => v !== null) as ClickfunnelsVariant[]
    console.log(`Fetched ${allVariants.length} variants for product ID: ${productId}`)

    // Fetch all prices for each variant
    const allPrices: ClickfunnelsPrice[] = []
    for (const variant of allVariants) {
      if (variant.price_ids && variant.price_ids.length > 0) {
        console.log(`Fetching prices for variant ID: ${variant.id}`)
        const pricePromises = variant.price_ids.map((priceId) =>
          getClickfunnelsPrice(priceId).catch((err) => {
            console.error(`Error fetching price ${priceId}:`, err)
            return null
          }),
        )

        const variantPrices = (await Promise.all(pricePromises)).filter((p) => p !== null) as ClickfunnelsPrice[]
        console.log(`Fetched ${variantPrices.length} prices for variant ID: ${variant.id}`)

        // Assign prices to the variant
        variant.prices = variantPrices

        allPrices.push(...variantPrices)
      }
    }

    console.log(`Total prices fetched for product ID ${productId}: ${allPrices.length}`)

    // Filter out invalid variants (archived, deleted, or without valid prices)
    const validVariants = await Promise.all(
      allVariants.map(async (v) => {
        const isValid = await isValidVariant(v)
        return isValid ? v : null
      }),
    )
    const filteredVariants = validVariants.filter((v) => v !== null) as ClickfunnelsVariant[]

    console.log(`Found ${filteredVariants.length} valid variants out of ${allVariants.length} total variants`)

    // Return the product with valid variants and prices
    return {
      ...product,
      variants: filteredVariants,
      prices: allPrices,
    }
  } catch (error) {
    console.error(`Error fetching product with variants and prices for ${productId}:`, error)
    throw error
  }
}

// Functie om alle producten met varianten op te halen
export async function getAllProductsWithVariants(): Promise<ClickfunnelsProduct[]> {
  try {
    // Fetch all products
    const products = await getClickfunnelsProducts()

    // For each product, fetch its variants
    const productsWithVariants = await Promise.all(
      products.map(async (product) => {
        try {
          // Fetch all variants for this product
          const variantPromises = product.variant_ids.map((variantId) =>
            getClickfunnelsVariant(variantId).catch((err) => {
              console.error(`Error fetching variant ${variantId}:`, err)
              return null
            }),
          )

          const allVariants = (await Promise.all(variantPromises)).filter((v) => v !== null) as ClickfunnelsVariant[]

          // Fetch all prices for each variant
          const allPrices: ClickfunnelsPrice[] = []
          for (const variant of allVariants) {
            if (variant.price_ids && variant.price_ids.length > 0) {
              const pricePromises = variant.price_ids.map((priceId) =>
                getClickfunnelsPrice(priceId).catch((err) => {
                  console.error(`Error fetching price ${priceId}:`, err)
                  return null
                }),
              )
              const variantPrices = (await Promise.all(pricePromises)).filter((p) => p !== null) as ClickfunnelsPrice[]

              // Assign prices to the variant
              variant.prices = variantPrices

              allPrices.push(...variantPrices)
            }
          }

          // Filter out invalid variants
          const validVariants = await Promise.all(
            allVariants.map(async (v) => {
              const isValid = await isValidVariant(v)
              return isValid ? v : null
            }),
          )
          const filteredVariants = validVariants.filter((v) => v !== null) as ClickfunnelsVariant[]

          return {
            ...product,
            variants: filteredVariants,
            prices: allPrices,
          }
        } catch (error) {
          console.error(`Error processing product ${product.id}:`, error)
          return product // Return the original product without variants if there's an error
        }
      }),
    )

    return productsWithVariants
  } catch (error) {
    console.error("Error fetching all products with variants:", error)
    throw error
  }
}

// Functie om de cache voor een specifiek product te invalideren
export async function invalidateProductCache(productId: string): Promise<void> {
  // Invalideer de product cache
  apiCache.delete(`products:${productId}`)

  // Invalideer ook gerelateerde caches
  apiCache.invalidateType("variants")
  apiCache.invalidateType("prices")

  console.log(`Cache voor product ${productId} en gerelateerde data is geïnvalideerd`)
}

/**
 * Maakt een nieuw contact aan of werkt een bestaand contact bij in ClickFunnels
 * @param contact De contactgegevens
 * @returns Een object met het resultaat van de operatie
 */
export async function upsertClickFunnelsContact(contact: ClickFunnelsContact) {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!CLICKFUNNELS_WORKSPACE_ID) {
    throw new Error("ClickFunnels workspace ID is niet geconfigureerd")
  }

  try {
    console.log(`Making upsert API request to ClickFunnels with data:`, JSON.stringify(contact, null, 2))

    // Use the upsert endpoint
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN_OLD}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts/upsert`

    console.log(`Using ClickFunnels upsert API URL: ${API_URL}`)

    // Prepare the contact object in the format expected by the API
    const contactData = {
      contact: {
        email_address: contact.email,
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        // Explicitly omit phone_number to prevent the "Phone number has already been taken" error
        time_zone: contact.time_zone || null,
        fb_url: contact.fb_url || null,
        twitter_url: contact.twitter_url || null,
        instagram_url: contact.instagram_url || null,
        linkedin_url: contact.linkedin_url || null,
        website_url: contact.website_url || null,
      },
    }

    // Add custom attributes if they exist
    if (contact.custom_fields) {
      contactData.contact.custom_attributes = contact.custom_fields
    }

    // Add tags if they exist
    if (contact.tags && contact.tags.length > 0) {
      contactData.contact.tag_ids = contact.tags.map((tag) => ({ name: tag }))
    }

    console.log(`Contact upsert data:`, JSON.stringify(contactData, null, 2))

    // Implementeer retry logic voor betere betrouwbaarheid
    let lastError = null
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Create or update the contact in ClickFunnels
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            Accept: "application/json",
          },
          body: JSON.stringify(contactData),
          cache: "no-store",
        })

        const responseText = await response.text()
        console.log(`ClickFunnels API upsert response status: ${response.status}`)
        console.log(`ClickFunnels API upsert response body: ${responseText}`)

        if (!response.ok) {
          console.error("ClickFunnels API upsert error:", responseText)
          lastError = new Error(`ClickFunnels API upsert error: ${response.status}`)

          // Als dit niet de laatste poging is, wacht dan en probeer opnieuw
          if (attempt < MAX_RETRIES) {
            console.log(`Retrying upsert (attempt ${attempt + 1} of ${MAX_RETRIES}) after ${RETRY_DELAY_MS}ms...`)
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
            continue
          }

          throw lastError
        }

        // The response is an array with a single contact object
        const data = JSON.parse(responseText)
        const contactId = data.id || (Array.isArray(data) && data.length > 0 ? data[0].id : null)

        if (!contactId) {
          throw new Error("No contact ID returned from upsert operation")
        }

        console.log(`Contact upserted with ID: ${contactId}`)

        return { success: true, data, contactId }
      } catch (error) {
        lastError = error

        // Als dit niet de laatste poging is, wacht dan en probeer opnieuw
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying upsert (attempt ${attempt + 1} of ${MAX_RETRIES}) after ${RETRY_DELAY_MS}ms...`)
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          continue
        }

        // Als dit de laatste poging is, geef dan de fout terug
        return { success: false, error: String(error) }
      }
    }

    // Fallback return voor het geval de for-lus voltooid wordt zonder een return
    return { success: false, error: "Maximum aantal pogingen bereikt zonder succes" }
  } catch (error) {
    console.error("Error upserting ClickFunnels contact:", error)
    return { success: false, error: String(error) }
  }
}

/**
 * Haalt een contact op uit ClickFunnels op basis van e-mailadres
 * @param email Het e-mailadres van het contact
 * @returns Een object met het resultaat van de operatie
 */
export async function getContactByEmail(
  email: string,
): Promise<{ success: boolean; contactId?: number; error?: string }> {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!CLICKFUNNELS_WORKSPACE_ID) {
    throw new Error("ClickFunnels workspace ID is niet geconfigureerd")
  }

  try {
    console.log(`Getting contact by email: ${email}`)

    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN_OLD}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts?query=${email}`

    console.log(`Using ClickFunnels API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const responseText = await response.text()
    console.log(`ClickFunnels API response status: ${response.status}`)
    console.log(`ClickFunnels API response body: ${responseText}`)

    if (!response.ok) {
      console.error("ClickFunnels API error:", responseText)
      return { success: false, error: `ClickFunnels API error: ${response.status}` }
    }

    const data = JSON.parse(responseText)

    // Check if any contacts were found
    if (Array.isArray(data) && data.length > 0) {
      const contactId = data[0].id
      console.log(`Found contact with ID: ${contactId}`)
      return { success: true, contactId }
    } else {
      console.log("No contact found with that email")
      return { success: true, contactId: undefined }
    }
  } catch (error) {
    console.error("Error getting ClickFunnels contact:", error)
    return { success: false, error: String(error) }
  }
}

// Voeg deze functie toe of update de bestaande functie om te controleren of een variant geldig is
export async function isValidVariant(variant: any) {
  if (!variant) return false

  // Een variant is geldig als hij niet gearchiveerd is
  if (variant.archived) return false

  // Een variant moet ten minste één geldige prijs hebben
  const hasValidPrices =
    variant.prices && variant.prices.some((price: any) => price && !price.archived && !price.deleted)

  return hasValidPrices
}
