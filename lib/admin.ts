"use server"
import { CLICKFUNNELS_API_TOKEN, CLICKFUNNELS_SUBDOMAIN, CLICKFUNNELS_WORKSPACE_ID } from "./config"

// Type definities voor statistieken
export interface DashboardStats {
  products: {
    total: number
    trend: number
    trendLabel: string
  }
  courses: {
    total: number
    trend: number
    trendLabel: string
  }
  payments: {
    total: number
    trend: number
    trendLabel: string
  }
  enrollments: {
    total: number
    trend: number
    trendLabel: string
  }
}

export interface RecentActivity {
  id: string
  type: "enrollment" | "payment" | "error"
  title: string
  description: string
  time: string
  timestamp: Date
}

export interface Course {
  id: number
  public_id: string | null
  title: string
  description: string
  image_url: string | null
  created_at: string | null
  updated_at: string | null
  current_path: string | null
}

export interface ClickFunnelsPrice {
  id: number
  amount: number
  currency: string
  recurring: boolean
  interval?: string
  interval_count?: number
  name?: string
}

export interface ClickFunnelsVariant {
  id: number
  public_id?: string
  name: string
  description: string | null
  sku?: string
  product_id?: number
  properties_value_ids?: number[]
  archived?: boolean
  visible?: boolean
  created_at?: string
  updated_at?: string
  default?: boolean
  properties_values?: Array<{
    property_id: number
    value: string
  }>
  prices?: ClickFunnelsPrice[]
}

export interface ClickFunnelsProduct {
  id: number
  public_id: string
  name: string
  description?: string
  visible_in_store?: boolean
  visible_in_customer_center?: boolean
  archived?: boolean
  created_at?: string
  updated_at?: string
  variant_ids?: string[]
  variants?: any[]
  prices?: any[]
  defaultPrice?: {
    amount: number
    currency: string
  }
  variant?: {
    id: number
    name: string
  }
}

/**
 * Haalt een specifiek product op uit ClickFunnels op basis van ID
 * @param productId Het ID van het product
 * @returns Het product of null als het niet gevonden is
 */
export async function getClickFunnelsProduct(productId: string) {
  if (!CLICKFUNNELS_API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!CLICKFUNNELS_SUBDOMAIN) {
    throw new Error("ClickFunnels subdomain is niet geconfigureerd")
  }

  try {
    console.log(`Fetching ClickFunnels product with ID: ${productId}`)

    const subdomain = CLICKFUNNELS_SUBDOMAIN
    const API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/products/${productId}`

    console.log(`API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
      },
      cache: "no-store", // Zorg ervoor dat we altijd verse data ophalen
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Product with ID ${productId} not found`)
        return null
      }
      throw new Error(`ClickFunnels API error: ${response.status}`)
    }

    const product = await response.json()
    return product
  } catch (error) {
    console.error("Error fetching ClickFunnels product:", error)
    throw error
  }
}

/**
 * Haalt een specifieke variant op uit ClickFunnels op basis van ID
 * @param variantId Het ID van de variant
 * @returns De variant of null als deze niet gevonden is
 */
export async function getClickFunnelsVariant(variantId: string | number) {
  if (!CLICKFUNNELS_API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!CLICKFUNNELS_SUBDOMAIN) {
    throw new Error("ClickFunnels subdomain is niet geconfigureerd")
  }

  try {
    console.log(`Fetching ClickFunnels variant with ID: ${variantId}`)

    const subdomain = CLICKFUNNELS_SUBDOMAIN
    const API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/products/variants/${variantId}`

    console.log(`API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
      },
      cache: "no-store", // Zorg ervoor dat we altijd verse data ophalen
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Variant with ID ${variantId} not found`)
        return null
      }
      throw new Error(`ClickFunnels API error: ${response.status}`)
    }

    const variant = await response.json()
    return variant
  } catch (error) {
    console.error("Error fetching ClickFunnels variant:", error)
    throw error
  }
}

/**
 * Haalt de varianten van een product op
 * @param productId Het ID van het product
 * @returns De varianten van het product
 */
export async function getProductVariants(productId: string) {
  if (!CLICKFUNNELS_API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!CLICKFUNNELS_SUBDOMAIN) {
    throw new Error("ClickFunnels subdomain is niet geconfigureerd")
  }

  try {
    console.log(`Fetching variants for product with ID: ${productId}`)

    const subdomain = CLICKFUNNELS_SUBDOMAIN
    const API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/products/${productId}/variants`

    console.log(`API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`ClickFunnels API error: ${response.status}`)
    }

    const variants = await response.json()
    return variants
  } catch (error) {
    console.error("Error fetching product variants:", error)
    throw error
  }
}

/**
 * Haalt de prijzen van een product op
 * @param productId Het ID van het product
 * @returns De prijzen van het product
 */
export async function getProductPrices(productId: string) {
  if (!CLICKFUNNELS_API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!CLICKFUNNELS_SUBDOMAIN) {
    throw new Error("ClickFunnels subdomain is niet geconfigureerd")
  }

  try {
    console.log(`Fetching prices for product with ID: ${productId}`)

    const subdomain = CLICKFUNNELS_SUBDOMAIN
    const API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/products/${productId}/prices`

    console.log(`API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`ClickFunnels API error: ${response.status}`)
    }

    const prices = await response.json()
    return prices
  } catch (error) {
    console.error("Error fetching product prices:", error)
    throw error
  }
}

/**
 * Haalt de prijzen van een variant op
 * @param variantId Het ID van de variant
 * @returns De prijzen van de variant
 */
export async function getVariantPrices(variantId: string | number) {
  if (!CLICKFUNNELS_API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!CLICKFUNNELS_SUBDOMAIN) {
    throw new Error("ClickFunnels subdomain is niet geconfigureerd")
  }

  try {
    console.log(`Fetching prices for variant with ID: ${variantId}`)

    const subdomain = CLICKFUNNELS_SUBDOMAIN
    const API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/products/variants/${variantId}/prices`

    console.log(`API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`ClickFunnels API error: ${response.status}`)
    }

    const prices = await response.json()
    return prices
  } catch (error) {
    console.error("Error fetching variant prices:", error)
    throw error
  }
}

// Functie om cursussen op te halen van ClickFunnels API
export async function getCourses(): Promise<Course[]> {
  try {
    const subdomain = CLICKFUNNELS_SUBDOMAIN
    const workspaceId = CLICKFUNNELS_WORKSPACE_ID
    const apiToken = CLICKFUNNELS_API_TOKEN

    if (!subdomain || !workspaceId || !apiToken) {
      console.error("ClickFunnels configuratie ontbreekt")
      return []
    }

    console.log(`Fetching courses from ClickFunnels API`)
    console.log(`API URL: https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${workspaceId}/courses`)

    const response = await fetch(`https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${workspaceId}/courses`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
      cache: "no-store", // Geen caching om altijd de meest recente data te krijgen
    })

    if (!response.ok) {
      console.error(`ClickFunnels API error: ${response.status} ${response.statusText}`)
      return []
    }

    const courses = await response.json()
    return courses
  } catch (error) {
    console.error("Error fetching courses:", error)
    return []
  }
}

// Functie om producten op te halen van ClickFunnels API
export async function getClickFunnelsProducts(): Promise<ClickFunnelsProduct[]> {
  try {
    // Altijd verse data ophalen
    const response = await fetch(`https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products`, {
      headers: {
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store", // Geen caching op HTTP-niveau
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`)
    }

    const products = await response.json()

    // Verrijk de producten met extra informatie
    const enrichedProducts = await Promise.all(
      products.map(async (product: ClickFunnelsProduct) => {
        try {
          // Haal de eerste variant op voor dit product (indien beschikbaar)
          if (product.variant_ids && product.variant_ids.length > 0) {
            const variantId = product.variant_ids[0]
            const variantResponse = await fetch(
              `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/variants/${variantId}`,
              {
                headers: {
                  Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
                  Accept: "application/json",
                },
                cache: "no-store",
              },
            )

            if (variantResponse.ok) {
              const variant = await variantResponse.json()
              product.variant = {
                id: variant.id,
                name: variant.name,
              }

              // Haal de eerste prijs op voor deze variant (indien beschikbaar)
              if (variant.price_ids && variant.price_ids.length > 0) {
                const priceId = variant.price_ids[0]
                const priceResponse = await fetch(
                  `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/prices/${priceId}`,
                  {
                    headers: {
                      Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
                      Accept: "application/json",
                    },
                    cache: "no-store",
                  },
                )

                if (priceResponse.ok) {
                  const price = await priceResponse.json()
                  product.defaultPrice = {
                    amount: price.amount,
                    currency: price.currency,
                  }
                }
              }
            }
          }

          return product
        } catch (error) {
          console.error(`Error enriching product ${product.id}:`, error)
          return product
        }
      }),
    )

    return enrichedProducts
  } catch (error) {
    console.error("Error fetching ClickFunnels products:", error)
    throw error
  }
}

// Functie om dashboard statistieken op te halen
export async function getDashboardStats(bypassCache = true) {
  // Hier zou je normaal gesproken data uit een database of API halen
  // Voor nu gebruiken we mock data
  return {
    products: { total: 12, trend: 2, trendLabel: "sinds vorige maand" },
    courses: { total: 5, trend: 1, trendLabel: "sinds vorige maand" },
    payments: { total: 156, trend: 12, trendLabel: "sinds vorige week" },
    enrollments: { total: 89, trend: 8, trendLabel: "sinds vorige week" },
  }
}

// Functie om recente activiteit op te halen
export async function getRecentActivity(limit = 5, bypassCache = true) {
  // Mock data voor recente activiteit
  return [
    {
      id: 1,
      type: "payment",
      user: "John Doe",
      amount: 99.99,
      date: "2023-05-15T10:30:00Z",
      status: "completed",
    },
    {
      id: 2,
      type: "enrollment",
      user: "Jane Smith",
      course: "Advanced Marketing",
      date: "2023-05-14T14:45:00Z",
      status: "active",
    },
    {
      id: 3,
      type: "payment",
      user: "Bob Johnson",
      amount: 149.99,
      date: "2023-05-13T09:15:00Z",
      status: "completed",
    },
    {
      id: 4,
      type: "enrollment",
      user: "Alice Brown",
      course: "SEO Fundamentals",
      date: "2023-05-12T16:20:00Z",
      status: "active",
    },
    {
      id: 5,
      type: "payment",
      user: "Charlie Wilson",
      amount: 79.99,
      date: "2023-05-11T11:05:00Z",
      status: "completed",
    },
  ]
}

// Functie om recente inschrijvingen op te halen
export async function getRecentEnrollments(limit = 5, bypassCache = true) {
  // Mock data voor recente inschrijvingen
  return [
    {
      id: 1,
      user: "Jane Smith",
      email: "jane.smith@example.com",
      course: "Advanced Marketing",
      date: "2023-05-14T14:45:00Z",
      status: "active",
    },
    {
      id: 2,
      user: "Alice Brown",
      email: "alice.brown@example.com",
      course: "SEO Fundamentals",
      date: "2023-05-12T16:20:00Z",
      status: "active",
    },
    {
      id: 3,
      user: "David Lee",
      email: "david.lee@example.com",
      course: "Content Creation Masterclass",
      date: "2023-05-10T13:30:00Z",
      status: "active",
    },
    {
      id: 4,
      user: "Emma Davis",
      email: "emma.davis@example.com",
      course: "Social Media Strategy",
      date: "2023-05-08T10:15:00Z",
      status: "active",
    },
    {
      id: 5,
      user: "Frank Miller",
      email: "frank.miller@example.com",
      course: "Email Marketing Essentials",
      date: "2023-05-06T09:45:00Z",
      status: "active",
    },
  ]
}

// Functie om cursussen op te halen
// export async function getCourses(bypassCache = true) {
//   // Mock data voor cursussen
//   return [
//     {
//       id: "course1",
//       name: "Advanced Marketing",
//       description: "Learn advanced marketing techniques and strategies.",
//       enrollments: 45,
//       rating: 4.8,
//     },
//     {
//       id: "course2",
//       name: "SEO Fundamentals",
//       description: "Master the basics of search engine optimization.",
//       enrollments: 32,
//       rating: 4.6,
//     },
//     {
//       id: "course3",
//       name: "Content Creation Masterclass",
//       description: "Create compelling content that engages your audience.",
//       enrollments: 28,
//       rating: 4.9,
//     },
//     {
//       id: "course4",
//       name: "Social Media Strategy",
//       description: "Develop effective social media strategies for your business.",
//       enrollments: 37,
//       rating: 4.7,
//     },
//     {
//       id: "course5",
//       name: "Email Marketing Essentials",
//       description: "Build successful email marketing campaigns.",
//       enrollments: 24,
//       rating: 4.5,
//     },
//   ]
// }

// Helper functie om valuta te formatteren
function formatCurrency(amount: number): string {
  // Als het bedrag kleiner is dan 10, gaan we ervan uit dat het in euro's is en vermenigvuldigen we met 100
  const amountInCents = amount < 10 ? amount * 100 : amount

  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100)
}

// Helper functie om datums te formatteren
function formatDate(date: Date): string {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === now.toDateString()) {
    return `Vandaag, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Gisteren, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  } else {
    return `${date.getDate()} ${["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"][date.getMonth()]}, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  }
}
