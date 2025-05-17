"use server"

import { stripe } from "./stripe"
import { products } from "./products"
import { getProductCourseMapping } from "./products"

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
  public_id: string | null
  name: string
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
  // Toegevoegde velden voor prijsinformatie
  variant?: ClickFunnelsVariant
  variants?: ClickFunnelsVariant[]
  prices?: ClickFunnelsPrice[]
  defaultPrice?: ClickFunnelsPrice
}

/**
 * Haalt een specifiek product op uit ClickFunnels op basis van ID
 * @param productId Het ID van het product
 * @returns Het product of null als het niet gevonden is
 */
export async function getClickFunnelsProduct(productId: string) {
  if (!process.env.CLICKFUNNELS_API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!process.env.CLICKFUNNELS_SUBDOMAIN) {
    throw new Error("ClickFunnels subdomain is niet geconfigureerd")
  }

  try {
    console.log(`Fetching ClickFunnels product with ID: ${productId}`)

    const subdomain = process.env.CLICKFUNNELS_SUBDOMAIN
    const API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/products/${productId}`

    console.log(`API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.CLICKFUNNELS_API_TOKEN}`,
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
  if (!process.env.CLICKFUNNELS_API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!process.env.CLICKFUNNELS_SUBDOMAIN) {
    throw new Error("ClickFunnels subdomain is niet geconfigureerd")
  }

  try {
    console.log(`Fetching ClickFunnels variant with ID: ${variantId}`)

    const subdomain = process.env.CLICKFUNNELS_SUBDOMAIN
    const API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/products/variants/${variantId}`

    console.log(`API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.CLICKFUNNELS_API_TOKEN}`,
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
  if (!process.env.CLICKFUNNELS_API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!process.env.CLICKFUNNELS_SUBDOMAIN) {
    throw new Error("ClickFunnels subdomain is niet geconfigureerd")
  }

  try {
    console.log(`Fetching variants for product with ID: ${productId}`)

    const subdomain = process.env.CLICKFUNNELS_SUBDOMAIN
    const API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/products/${productId}/variants`

    console.log(`API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.CLICKFUNNELS_API_TOKEN}`,
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
  if (!process.env.CLICKFUNNELS_API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!process.env.CLICKFUNNELS_SUBDOMAIN) {
    throw new Error("ClickFunnels subdomain is niet geconfigureerd")
  }

  try {
    console.log(`Fetching prices for product with ID: ${productId}`)

    const subdomain = process.env.CLICKFUNNELS_SUBDOMAIN
    const API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/products/${productId}/prices`

    console.log(`API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.CLICKFUNNELS_API_TOKEN}`,
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
  if (!process.env.CLICKFUNNELS_API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!process.env.CLICKFUNNELS_SUBDOMAIN) {
    throw new Error("ClickFunnels subdomain is niet geconfigureerd")
  }

  try {
    console.log(`Fetching prices for variant with ID: ${variantId}`)

    const subdomain = process.env.CLICKFUNNELS_SUBDOMAIN
    const API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/products/variants/${variantId}/prices`

    console.log(`API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.CLICKFUNNELS_API_TOKEN}`,
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
    const subdomain = process.env.CLICKFUNNELS_SUBDOMAIN
    const workspaceId = process.env.CLICKFUNNELS_WORKSPACE_ID
    const apiToken = process.env.CLICKFUNNELS_API_TOKEN

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
    const subdomain = process.env.CLICKFUNNELS_SUBDOMAIN
    const workspaceId = process.env.CLICKFUNNELS_WORKSPACE_ID
    const apiToken = process.env.CLICKFUNNELS_API_TOKEN

    if (!subdomain || !workspaceId || !apiToken) {
      console.error("ClickFunnels configuratie ontbreekt")
      console.log("CLICKFUNNELS_SUBDOMAIN:", subdomain)
      console.log("CLICKFUNNELS_WORKSPACE_ID:", workspaceId)
      console.log("CLICKFUNNELS_API_TOKEN:", apiToken ? "Aanwezig" : "Ontbreekt")
      throw new Error("ClickFunnels configuratie ontbreekt")
    }

    console.log(`Fetching products from ClickFunnels API`)
    console.log(`API URL: https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${workspaceId}/products`)

    // Haal producten op
    const productsResponse = await fetch(
      `https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${workspaceId}/products`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    )

    if (!productsResponse.ok) {
      console.error(`ClickFunnels Products API error: ${productsResponse.status} ${productsResponse.statusText}`)
      const errorText = await productsResponse.text()
      console.error(`Error response: ${errorText}`)
      throw new Error(`ClickFunnels API error: ${productsResponse.status}`)
    }

    const products: ClickFunnelsProduct[] = await productsResponse.json()
    console.log(`Successfully fetched ${products.length} products from ClickFunnels`)

    // Verrijk producten met variant en prijsinformatie
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        try {
          if (product.default_variant_id) {
            console.log(
              `Fetching variant details for product ${product.id} (variant ID: ${product.default_variant_id})`,
            )

            // Haal variant details op
            const variantResponse = await fetch(
              `https://${subdomain}.myclickfunnels.com/api/v2/products/variants/${product.default_variant_id}`,
              {
                headers: {
                  Authorization: `Bearer ${apiToken}`,
                  Accept: "application/json",
                },
                cache: "no-store",
              },
            )

            if (variantResponse.ok) {
              const variant: ClickFunnelsVariant = await variantResponse.json()
              product.variant = variant
              console.log(`Successfully fetched variant for product ${product.id}`)

              // Haal prijzen op voor deze variant
              if (variant.price_ids && variant.price_ids.length > 0) {
                console.log(`Fetching prices for variant ${variant.id} (${variant.price_ids.length} prices)`)
                const prices: ClickFunnelsPrice[] = []

                for (const priceId of variant.price_ids) {
                  const priceResponse = await fetch(
                    `https://${subdomain}.myclickfunnels.com/api/v2/products/prices/${priceId}`,
                    {
                      headers: {
                        Authorization: `Bearer ${apiToken}`,
                        Accept: "application/json",
                      },
                      cache: "no-store",
                    },
                  )

                  if (priceResponse.ok) {
                    const price: ClickFunnelsPrice = await priceResponse.json()
                    prices.push(price)
                  } else {
                    console.error(`Error fetching price ${priceId}: ${priceResponse.status}`)
                  }
                }

                product.prices = prices
                console.log(`Successfully fetched ${prices.length} prices for product ${product.id}`)

                // Stel de standaard prijs in (eerste prijs)
                if (prices.length > 0) {
                  product.defaultPrice = prices[0]
                }
              }
            } else {
              console.error(`Error fetching variant ${product.default_variant_id}: ${variantResponse.status}`)
            }
          }
        } catch (error) {
          console.error(`Error fetching variant details for product ${product.id}:`, error)
        }
        return product
      }),
    )

    return enrichedProducts
  } catch (error) {
    console.error("Error fetching ClickFunnels products:", error)
    throw error
  }
}

// Functie om dashboard statistieken op te halen
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Producten tellen
    const productCount = products.length

    // Cursussen tellen - nu met echte data van ClickFunnels API
    let courseCount = 0
    try {
      const courses = await getCourses()
      courseCount = courses.length
    } catch (error) {
      console.error("Error fetching course count:", error)

      // Fallback naar product-cursus mapping als API faalt
      const productCourseMapping = getProductCourseMapping()
      const uniqueCourseIds = new Set<string>()
      Object.values(productCourseMapping).forEach(({ courses }) => {
        courses.forEach((courseId) => uniqueCourseIds.add(courseId))
      })
      courseCount = uniqueCourseIds.size
    }

    // Betalingen ophalen van Stripe (laatste 30 dagen)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60

    // Haal alle betalingen op van de afgelopen 30 dagen
    const allPayments = await stripe.paymentIntents.list({
      created: { gte: thirtyDaysAgo },
      limit: 100,
    })

    // Filter op succesvolle betalingen
    const successfulPayments = allPayments.data.filter((payment) => payment.status === "succeeded")

    // Bereken trends (laatste 7 dagen vs. de 7 dagen daarvoor)
    const recentPayments = successfulPayments.filter((payment) => payment.created >= sevenDaysAgo)
    const olderPayments = successfulPayments.filter(
      (payment) => payment.created < sevenDaysAgo && payment.created >= thirtyDaysAgo - 7 * 24 * 60 * 60,
    )

    const paymentTrend = recentPayments.length - olderPayments.length

    // Enrollments berekenen op basis van metadata in betalingen
    // In een echte implementatie zou je dit uit je eigen database halen
    let enrollmentCount = 0
    let recentEnrollments = 0
    let olderEnrollments = 0

    for (const payment of successfulPayments) {
      if (payment.metadata && payment.metadata.clickfunnels_course_ids) {
        try {
          const courseIds = JSON.parse(payment.metadata.clickfunnels_course_ids as string)
          enrollmentCount += courseIds.length

          if (payment.created >= sevenDaysAgo) {
            recentEnrollments += courseIds.length
          } else {
            olderEnrollments += courseIds.length
          }
        } catch (e) {
          // Als het geen geldige JSON is, ga ervan uit dat het één cursus is
          enrollmentCount += 1

          if (payment.created >= sevenDaysAgo) {
            recentEnrollments += 1
          } else {
            olderEnrollments += 1
          }
        }
      } else {
        // Als er geen specifieke cursus metadata is, ga ervan uit dat het één enrollment is
        enrollmentCount += 1

        if (payment.created >= sevenDaysAgo) {
          recentEnrollments += 1
        } else {
          olderEnrollments += 1
        }
      }
    }

    const enrollmentTrend = recentEnrollments - olderEnrollments

    return {
      products: {
        total: productCount,
        trend: 0, // Producten veranderen niet vaak, dus trend is 0
        trendLabel: "sinds vorige maand",
      },
      courses: {
        total: courseCount,
        trend: 0, // Cursussen veranderen niet vaak, dus trend is 0
        trendLabel: "sinds vorige maand",
      },
      payments: {
        total: successfulPayments.length,
        trend: paymentTrend,
        trendLabel: "sinds vorige week",
      },
      enrollments: {
        total: enrollmentCount,
        trend: enrollmentTrend,
        trendLabel: "sinds vorige week",
      },
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)

    // Return fallback data in case of error
    return {
      products: {
        total: products.length,
        trend: 0,
        trendLabel: "sinds vorige maand",
      },
      courses: {
        total: 3, // Hardcoded fallback
        trend: 0,
        trendLabel: "sinds vorige maand",
      },
      payments: {
        total: 0,
        trend: 0,
        trendLabel: "sinds vorige week",
      },
      enrollments: {
        total: 0,
        trend: 0,
        trendLabel: "sinds vorige week",
      },
    }
  }
}

// Functie om recente activiteiten op te halen
export async function getRecentActivity(limit = 10): Promise<RecentActivity[]> {
  try {
    const activities: RecentActivity[] = []

    // Haal recente betalingen op van Stripe
    const recentPayments = await stripe.paymentIntents.list({
      limit: 25, // Haal er meer op dan we nodig hebben, omdat we ze gaan filteren
      expand: ["data.customer"],
    })

    // Verwerk succesvolle betalingen
    for (const payment of recentPayments.data) {
      if (payment.status === "succeeded") {
        // Haal klantgegevens op
        let customerName = "Onbekende klant"
        let customerEmail = ""

        if (payment.customer) {
          try {
            // Als customer een string is (ID), haal dan de klantgegevens op
            if (typeof payment.customer === "string") {
              const customerData = await stripe.customers.retrieve(payment.customer)
              if (!customerData.deleted) {
                customerName = customerData.name || "Onbekende klant"
                customerEmail = customerData.email || ""
              }
            } else {
              // Als customer al een object is
              customerName = payment.customer.name || "Onbekende klant"
              customerEmail = payment.customer.email || ""
            }
          } catch (e) {
            console.error("Error fetching customer data:", e)
          }
        }

        // Bepaal productnaam uit metadata
        let productName = "onbekend product"
        if (payment.metadata && payment.metadata.productName) {
          productName = payment.metadata.productName as string
        }

        // Voeg betaling toe aan activiteiten
        activities.push({
          id: payment.id,
          type: "payment",
          title: "Betaling ontvangen",
          description: `${formatCurrency(payment.amount)} betaling ontvangen voor ${productName} van ${customerName}`,
          time: formatDate(new Date(payment.created * 1000)),
          timestamp: new Date(payment.created * 1000),
        })

        // Als er cursussen in de metadata staan, voeg dan ook enrollments toe
        if (payment.metadata && payment.metadata.clickfunnels_course_ids) {
          try {
            const courseIds = JSON.parse(payment.metadata.clickfunnels_course_ids as string)

            for (const courseId of courseIds) {
              // Bepaal cursusnaam
              let courseName = `Cursus (ID: ${courseId})`
              switch (courseId) {
                case "eWbLVk":
                  courseName = "12-Weken Vetverlies Programma"
                  break
                case "vgDnxN":
                  courseName = "Uitleg van Oefeningen"
                  break
                case "JMaGxK":
                  courseName = "Evotion-Coaching App Handleiding"
                  break
              }

              activities.push({
                id: `${payment.id}_${courseId}`,
                type: "enrollment",
                title: "Nieuwe inschrijving",
                description: `${customerName} heeft zich ingeschreven voor ${courseName}`,
                time: formatDate(new Date(payment.created * 1000)),
                timestamp: new Date(payment.created * 1000),
              })
            }
          } catch (e) {
            // Als het geen geldige JSON is, voeg dan één enrollment toe
            activities.push({
              id: `${payment.id}_enrollment`,
              type: "enrollment",
              title: "Nieuwe inschrijving",
              description: `${customerName} heeft zich ingeschreven voor een cursus`,
              time: formatDate(new Date(payment.created * 1000)),
              timestamp: new Date(payment.created * 1000),
            })
          }
        }
      } else if (payment.status === "requires_payment_method" || payment.status === "canceled") {
        // Voeg mislukte betalingen toe
        activities.push({
          id: payment.id,
          type: "error",
          title: "Betaling mislukt",
          description: `Betaling van ${formatCurrency(payment.amount)} is mislukt of geannuleerd`,
          time: formatDate(new Date(payment.created * 1000)),
          timestamp: new Date(payment.created * 1000),
        })
      }
    }

    // Sorteer op timestamp (nieuwste eerst) en beperk tot het gevraagde aantal
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit)
  } catch (error) {
    console.error("Error fetching recent activity:", error)

    // Return fallback data in case of error
    return [
      {
        id: "fallback-1",
        type: "enrollment",
        title: "Nieuwe inschrijving",
        description: "Jan Jansen heeft zich ingeschreven voor 12-Weken Vetverlies Programma",
        time: "Vandaag",
        timestamp: new Date(),
      },
      {
        id: "fallback-2",
        type: "payment",
        title: "Betaling ontvangen",
        description: "€299,00 betaling ontvangen voor VIP Coaching Pakket",
        time: "Gisteren",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ]
  }
}

// Functie om recente enrollments op te halen
export async function getRecentEnrollments(limit = 10): Promise<any[]> {
  try {
    // In een echte implementatie zou je dit uit je eigen database halen
    // Voor nu gebruiken we de Stripe betalingen als bron
    const recentPayments = await stripe.paymentIntents.list({
      limit: 25,
      expand: ["data.customer"],
    })

    const enrollments: any[] = []

    for (const payment of recentPayments.data) {
      if (payment.status === "succeeded" && payment.metadata && payment.metadata.clickfunnels_course_ids) {
        // Haal klantgegevens op
        let customerName = "Onbekende klant"
        let customerEmail = ""

        if (payment.customer) {
          try {
            if (typeof payment.customer === "string") {
              const customerData = await stripe.customers.retrieve(payment.customer)
              if (!customerData.deleted) {
                customerName = customerData.name || "Onbekende klant"
                customerEmail = customerData.email || ""
              }
            } else {
              customerName = payment.customer.name || "Onbekende klant"
              customerEmail = payment.customer.email || ""
            }
          } catch (e) {
            console.error("Error fetching customer data:", e)
          }
        }

        try {
          const courseIds = JSON.parse(payment.metadata.clickfunnels_course_ids as string)

          for (const courseId of courseIds) {
            // Bepaal cursusnaam
            let courseName = `Cursus (ID: ${courseId})`
            switch (courseId) {
              case "eWbLVk":
                courseName = "12-Weken Vetverlies Programma"
                break
              case "vgDnxN":
                courseName = "Uitleg van Oefeningen"
                break
              case "JMaGxK":
                courseName = "Evotion-Coaching App Handleiding"
                break
            }

            enrollments.push({
              id: `${payment.id}_${courseId}`,
              name: customerName,
              email: customerEmail,
              course: courseName,
              courseId: courseId,
              date: formatDate(new Date(payment.created * 1000)),
              timestamp: new Date(payment.created * 1000),
              status: "success",
            })
          }
        } catch (e) {
          // Als het geen geldige JSON is, voeg dan één enrollment toe
          enrollments.push({
            id: `${payment.id}_enrollment`,
            name: customerName,
            email: customerEmail,
            course: "Onbekende cursus",
            courseId: "",
            date: formatDate(new Date(payment.created * 1000)),
            timestamp: new Date(payment.created * 1000),
            status: "success",
          })
        }
      }
    }

    // Sorteer op timestamp (nieuwste eerst) en beperk tot het gevraagde aantal
    return enrollments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit)
  } catch (error) {
    console.error("Error fetching recent enrollments:", error)

    // Return fallback data in case of error
    return [
      {
        id: "fallback-1",
        name: "Jan Jansen",
        email: "jan@example.com",
        course: "12-Weken Vetverlies Programma",
        courseId: "eWbLVk",
        date: "Vandaag, 14:32",
        timestamp: new Date(),
        status: "success",
      },
      {
        id: "fallback-2",
        name: "Petra de Vries",
        email: "petra@example.com",
        course: "Premium Coaching Pakket",
        courseId: "",
        date: "Vandaag, 09:47",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        status: "error",
      },
    ]
  }
}

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
