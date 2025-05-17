"use server"

import type { ClickFunnelsContact, ClickFunnelsEnrollment } from "./types"

// Deze waarden moeten worden ingesteld als omgevingsvariabelen
const CLICKFUNNELS_SUBDOMAIN_OLD = process.env.CLICKFUNNELS_SUBDOMAIN || "myworkspace" // Vervang met je subdomain
const CLICKFUNNELS_WORKSPACE_ID = process.env.CLICKFUNNELS_WORKSPACE_ID || "" // Vervang met je workspace ID
const API_TOKEN = process.env.CLICKFUNNELS_API_TOKEN
const CLICKFUNNELS_ACCOUNT_ID = process.env.CLICKFUNNELS_ACCOUNT_ID || ""

// Constanten voor betere leesbaarheid en onderhoud
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

import { CLICKFUNNELS_API_TOKEN, CLICKFUNNELS_SUBDOMAIN } from "./config"

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
  // ... other properties
}

export async function getClickfunnelsProducts(): Promise<ClickfunnelsProduct[]> {
  try {
    const response = await fetch(`https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products`, {
      headers: {
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching ClickFunnels products:", error)
    throw error
  }
}

export async function getClickFunnelsProduct(id: string): Promise<ClickfunnelsProduct> {
  try {
    const response = await fetch(`https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/${id}`, {
      headers: {
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching ClickFunnels product ${id}:`, error)
    throw error
  }
}

export async function getClickfunnelsVariant(id: string): Promise<ClickfunnelsVariant> {
  try {
    const response = await fetch(
      `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/variants/${id}`,
      {
        headers: {
          Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
          Accept: "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch variant: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching ClickFunnels variant ${id}:`, error)
    throw error
  }
}

export async function getClickfunnelsPrice(id: string): Promise<ClickfunnelsPrice> {
  try {
    const response = await fetch(`https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/prices/${id}`, {
      headers: {
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch price: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching ClickFunnels price ${id}:`, error)
    throw error
  }
}

export async function getProductWithVariantsAndPrices(productId: string): Promise<ClickfunnelsProduct> {
  try {
    // Fetch the product
    const product = await getClickFunnelsProduct(productId)

    // Fetch all variants for this product
    const variantPromises = product.variant_ids.map((variantId) => getClickfunnelsVariant(variantId))
    const variants = await Promise.all(variantPromises)

    // Fetch all prices for each variant
    const allPrices: ClickfunnelsPrice[] = []
    for (const variant of variants) {
      if (variant.price_ids && variant.price_ids.length > 0) {
        const pricePromises = variant.price_ids.map((priceId) => getClickfunnelsPrice(priceId))
        const variantPrices = await Promise.all(pricePromises)
        allPrices.push(...variantPrices)
      }
    }

    // Return the product with variants and prices
    return {
      ...product,
      variants,
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

          const variants = (await Promise.all(variantPromises)).filter((v) => v !== null) as ClickfunnelsVariant[]

          // Fetch all prices for each variant
          const allPrices: ClickfunnelsPrice[] = []
          for (const variant of variants) {
            if (variant.price_ids && variant.price_ids.length > 0) {
              const pricePromises = variant.price_ids.map((priceId) =>
                getClickfunnelsPrice(priceId).catch((err) => {
                  console.error(`Error fetching price ${priceId}:`, err)
                  return null
                }),
              )
              const variantPrices = (await Promise.all(pricePromises)).filter((p) => p !== null) as ClickfunnelsPrice[]
              allPrices.push(...variantPrices)
            }
          }

          return {
            ...product,
            variants,
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

export async function createClickFunnelsContact(contact: ClickFunnelsContact) {
  // For backward compatibility, just call upsert
  return upsertClickFunnelsContact(contact)
}

export async function updateClickFunnelsContact(contact: ClickFunnelsContact) {
  // For backward compatibility, just call upsert
  return upsertClickFunnelsContact(contact)
}

export async function createCourseEnrollment(enrollment: ClickFunnelsEnrollment) {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  try {
    console.log(
      `Creating course enrollment for contact ID: ${enrollment.contact_id} in course ID: ${enrollment.course_id}`,
    )

    // First, check if the contact is already enrolled in the course
    const existingEnrollments = await getContactEnrollments(enrollment.contact_id, enrollment.course_id)

    // If the contact is already enrolled, return success without creating a new enrollment
    if (
      existingEnrollments.success &&
      existingEnrollments.data &&
      existingEnrollments.data.courses_enrollments &&
      existingEnrollments.data.courses_enrollments.length > 0
    ) {
      console.log(
        `Contact ${enrollment.contact_id} is already enrolled in course ${enrollment.course_id}. Skipping enrollment.`,
      )
      return {
        success: true,
        data: existingEnrollments.data.courses_enrollments[0],
        alreadyEnrolled: true,
      }
    }

    // Check if course_id is a string (like "eWbLVk") or a number
    const courseId = typeof enrollment.course_id === "string" ? enrollment.course_id : enrollment.course_id.toString()

    // URL voor het aanmaken van een enrollment
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN_OLD}.myclickfunnels.com/api/v2/courses/${courseId}/enrollments`

    console.log(`Using ClickFunnels Enrollment API URL: ${API_URL}`)

    // Updated enrollment data structure based on the example
    const enrollmentData = {
      courses_enrollment: {
        contact_id: enrollment.contact_id,
        suspended: false, // Add this field based on the example
        origination_source_type: enrollment.origination_source_type || "api",
        origination_source_id: enrollment.origination_source_id || 1,
      },
    }

    console.log(`Enrollment data:`, JSON.stringify(enrollmentData, null, 2))

    // Implementeer retry logic voor betere betrouwbaarheid
    let lastError = null
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Create the enrollment in ClickFunnels
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
            Accept: "application/json",
          },
          body: JSON.stringify(enrollmentData),
        })

        const responseText = await response.text()
        console.log(`ClickFunnels Enrollment API response status: ${response.status}`)
        console.log(`ClickFunnels Enrollment API response body: ${responseText}`)

        if (!response.ok) {
          console.error("ClickFunnels Enrollment API error:", responseText)

          // Try to parse the error response for more details
          try {
            const errorData = JSON.parse(responseText)
            console.error("Detailed enrollment error:", errorData)

            // Check if there's a specific error message we can handle
            if (errorData.errors && errorData.errors.length > 0) {
              const errorMessages = errorData.errors
                .map((err: any) => err.detail || err.message || JSON.stringify(err))
                .join(", ")
              lastError = new Error(`ClickFunnels Enrollment API error: ${errorMessages}`)
            } else {
              lastError = new Error(`ClickFunnels Enrollment API error: ${response.status}`)
            }
          } catch (parseError) {
            // If we can't parse the error, just continue with the original error
            console.error("Could not parse error response:", parseError)
            lastError = new Error(`ClickFunnels Enrollment API error: ${response.status}`)
          }

          // Als dit niet de laatste poging is, wacht dan en probeer opnieuw
          if (attempt < MAX_RETRIES) {
            console.log(`Retrying enrollment (attempt ${attempt + 1} of ${MAX_RETRIES}) after ${RETRY_DELAY_MS}ms...`)
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
            continue
          }

          throw lastError
        }

        const data = JSON.parse(responseText)
        return { success: true, data, alreadyEnrolled: false }
      } catch (error) {
        lastError = error

        // Als dit niet de laatste poging is, wacht dan en probeer opnieuw
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying enrollment (attempt ${attempt + 1} of ${MAX_RETRIES}) after ${RETRY_DELAY_MS}ms...`)
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          continue
        }
      }
    }

    // Als we hier komen, zijn alle pogingen mislukt
    console.error("All enrollment attempts failed:", lastError)
    return { success: false, error: String(lastError) }
  } catch (error) {
    console.error("Error creating ClickFunnels enrollment:", error)
    return { success: false, error: String(error) }
  }
}

export async function getContactEnrollments(contactId: number, courseId: string | number) {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  try {
    console.log(`Checking enrollments for contact ID: ${contactId} in course ID: ${courseId}`)

    // URL voor het ophalen van enrollments
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN_OLD}.myclickfunnels.com/api/v2/courses/${courseId}/enrollments?filter[contact_id]=${contactId}`

    console.log(`Using ClickFunnels Enrollment API URL: ${API_URL}`)

    // Get enrollments from ClickFunnels
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const responseText = await response.text()
    console.log(`ClickFunnels Enrollment API response status: ${response.status}`)
    console.log(`ClickFunnels Enrollment API response body: ${responseText}`)

    if (!response.ok) {
      console.error("ClickFunnels Enrollment API error:", responseText)
      throw new Error(`ClickFunnels Enrollment API error: ${response.status}`)
    }

    const data = JSON.parse(responseText)
    return { success: true, data }
  } catch (error) {
    console.error("Error getting ClickFunnels enrollments:", error)
    return { success: false, error: String(error) }
  }
}

// Add a function to track enrollments to prevent duplicates
const enrollmentTracker = new Map<string, boolean>()

// Maak deze functie ook async, ook al voert het geen asynchrone operaties uit
export async function trackEnrollment(
  sessionId: string,
  contactId: number,
  courseId: string | number,
): Promise<boolean> {
  const key = `${sessionId}_${contactId}_${courseId}`

  if (enrollmentTracker.has(key)) {
    console.log(`Enrollment already processed for session ${sessionId}, contact ${contactId}, course ${courseId}`)
    return false
  }

  enrollmentTracker.set(key, true)
  console.log(`Tracking new enrollment for session ${sessionId}, contact ${contactId}, course ${courseId}`)
  return true
}

/**
 * Haalt een contact op uit ClickFunnels op basis van e-mailadres
 * @param email Het e-mailadres van het contact
 * @returns Een object met het resultaat van de operatie
 */
export async function getContactByEmail(email: string) {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!CLICKFUNNELS_WORKSPACE_ID) {
    throw new Error("ClickFunnels workspace ID is niet geconfigureerd")
  }

  try {
    console.log(`Getting contact by email: ${email}`)

    // URL voor het ophalen van een contact op basis van e-mailadres
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN_OLD}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts?filter[email_address]=${encodeURIComponent(email)}`

    console.log(`Using ClickFunnels API URL: ${API_URL}`)

    // Get contact from ClickFunnels
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

    if (!response.ok) {
      console.error("ClickFunnels API error:", responseText)
      throw new Error(`ClickFunnels API error: ${response.status}`)
    }

    const data = JSON.parse(responseText)

    // Check if any contacts were found
    if (Array.isArray(data) && data.length > 0) {
      console.log(`Found contact with ID: ${data[0].id}`)
      return { success: true, data: data[0], contactId: data[0].id }
    } else {
      console.log(`No contact found with email: ${email}`)
      return { success: false, error: "Contact not found" }
    }
  } catch (error) {
    console.error("Error getting ClickFunnels contact:", error)
    return { success: false, error: String(error) }
  }
}
