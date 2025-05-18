"use server"

import type { ClickFunnelsContact } from "./types"
import { fetchWithRateLimiting } from "./api-helpers"

// Deze waarden moeten worden ingesteld als omgevingsvariabelen
const CLICKFUNNELS_SUBDOMAIN_OLD = process.env.CLICKFUNNELS_SUBDOMAIN || "myworkspace" // Vervang met je subdomain
const CLICKFUNNELS_WORKSPACE_ID = process.env.CLICKFUNNELS_WORKSPACE_ID || "" // Vervang met je workspace ID
const API_TOKEN = process.env.CLICKFUNNELS_API_TOKEN
const CLICKFUNNELS_ACCOUNT_ID = process.env.CLICKFUNNELS_ACCOUNT_ID || ""

// Constanten voor betere leesbaarheid en onderhoud
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

import { CLICKFUNNELS_API_TOKEN, CLICKFUNNELS_SUBDOMAIN } from "./config"
import { apiCache } from "./cache"

export interface ClickfunnelsProduct {
  id: number
  public_id: string
  name: string
  description: string
  variant_ids: string[]
  variants?: ClickfunnelsVariant[]
  prices?: ClickfunnelsPrice[]
  // ... other properties
}

export interface ClickfunnelsVariant {
  id: number
  public_id: string
  product_id: number
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

export interface ClickfunnelsPrice {
  id: number
  public_id: string
  variant_id: number
  amount: number
  currency: string
  recurring: boolean
  recurring_interval?: string
  recurring_interval_count?: number
  archived?: boolean
  deleted?: boolean
  // ... other properties
}

/**
 * Controleert of een variant geldig is (niet verwijderd en heeft een prijs)
 * @param variant De variant om te controleren
 * @returns true als de variant geldig is, anders false
 */
export function isValidVariant(variant: ClickfunnelsVariant): boolean {
  // Controleer of de variant niet gearchiveerd of verwijderd is
  if (variant.archived === true || variant.deleted === true) {
    console.log(`Variant ${variant.id} is archived or deleted, skipping`)
    return false
  }

  // Controleer of de variant prijzen heeft
  if (!variant.price_ids || variant.price_ids.length === 0) {
    console.log(`Variant ${variant.id} has no price_ids, skipping`)
    return false
  }

  // Als de variant prices heeft, controleer dan of er geldige prijzen zijn
  if (variant.prices && variant.prices.length > 0) {
    const validPrices = variant.prices.filter(
      (price) =>
        price.archived !== true && price.deleted !== true && price.amount !== undefined && price.amount !== null,
    )

    if (validPrices.length === 0) {
      console.log(`Variant ${variant.id} has no valid prices, skipping`)
      return false
    }
  }

  return true
}

/**
 * Controleert of een prijs geldig is (niet verwijderd en heeft een bedrag)
 * @param price De prijs om te controleren
 * @returns true als de prijs geldig is, anders false
 */
export function isValidPrice(price: ClickfunnelsPrice): boolean {
  // Controleer of de prijs niet gearchiveerd of verwijderd is
  if (price.archived === true || price.deleted === true) {
    return false
  }

  // Controleer of de prijs een bedrag heeft
  if (price.amount === undefined || price.amount === null) {
    return false
  }

  return true
}

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

export async function getClickfunnelsVariant(id: string): Promise<ClickfunnelsVariant> {
  try {
    if (!CLICKFUNNELS_API_TOKEN || !CLICKFUNNELS_SUBDOMAIN) {
      throw new Error("ClickFunnels API token of subdomain ontbreekt")
    }

    // Gebruik fetchWithRateLimiting voor betere foutafhandeling en rate limiting
    const data = await fetchWithRateLimiting<ClickfunnelsVariant>(
      `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/variants/${id}`,
      {
        headers: {
          Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
          Accept: "application/json",
        },
      },
      `clickfunnels_variant_${id}`, // Cache key
      5 * 60 * 1000, // 5 minuten cache TTL
    )

    return data
  } catch (error) {
    console.error(`Error fetching ClickFunnels variant ${id}:`, error)
    throw error
  }
}

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

    console.log(`Successfully fetched price with ID ${id}:`, JSON.stringify(data, null, 2))
    return data
  } catch (error) {
    console.error(`Error fetching ClickFunnels price ${id}:`, error)
    throw error
  }
}

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
    const validVariants = allVariants.filter(isValidVariant)
    console.log(`Found ${validVariants.length} valid variants out of ${allVariants.length} total variants`)

    // Return the product with valid variants and prices
    return {
      ...product,
      variants: validVariants,
      prices: allPrices,
    }
  } catch (error) {
    console.error(`Error fetching product with variants and prices for ${productId}:`, error)
    throw error
  }
}

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
          const validVariants = allVariants.filter(isValidVariant)

          return {
            ...product,
            variants: validVariants,
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
      }
    }

    // Als we hier komen, zijn alle pogingen mislukt
    console.error("All upsert attempts failed:", lastError)
    return { success: false, error: String(lastError) }
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
