"use server"

import { fetchWithRateLimiting } from "./api-helpers"
import { CLICKFUNNELS_API_TOKEN, CLICKFUNNELS_SUBDOMAIN } from "./config"
import type { ClickfunnelsProduct, ClickfunnelsVariant, ClickfunnelsPrice } from "./clickfunnels"

// Functie om een product op te halen uit ClickFunnels
export async function getClickfunnelsProduct(id: string): Promise<ClickfunnelsProduct> {
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

// Functie om een variant op te halen uit ClickFunnels
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

// Functie om een prijs op te halen uit ClickFunnels
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

// Functie om een product met varianten en prijzen op te halen
export async function getProductWithVariantsAndPrices(productId: string): Promise<ClickfunnelsProduct> {
  try {
    console.log(`Fetching product with variants and prices for product ID: ${productId}`)

    // Fetch the product
    const product = await getClickfunnelsProduct(productId)
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

    // Import helper functions
    const { isValidVariant } = await import("./clickfunnels-helpers")

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
