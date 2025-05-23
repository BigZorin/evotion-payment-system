"use server"

import { stripe } from "@/lib/stripe-server"
import { products } from "./products"
import { getProductCourseMapping } from "./products"
import {
  CLICKFUNNELS_API_TOKEN,
  CLICKFUNNELS_SUBDOMAIN,
  CLICKFUNNELS_WORKSPACE_ID,
  CLICKFUNNELS_NUMERIC_WORKSPACE_ID,
} from "./config"
import { formatCurrency, formatDate } from "./clickfunnels-helpers"

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

// Betaaltype enum voor betere type veiligheid
export enum PaymentType {
  OneTime = "one_time",
  Subscription = "subscription",
  PaymentPlan = "payment_plan",
}

// Voeg extra velden toe aan de ClickFunnelsPrice interface voor betalingsplannen
export interface ClickFunnelsPrice {
  id: number
  amount: number
  currency: string
  payment_type: PaymentType | string // Gebruik het payment_type veld om het type betaling te bepalen
  recurring: boolean
  recurring_interval?: string
  recurring_interval_count?: number
  name?: string
  price_type?: string
  archived?: boolean
  // Velden voor betalingsplannen
  installments_count?: number
  installment_amount?: number
  installment_period?: string
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

    // Log de volledige prijsdata om te zien of payment_type aanwezig is
    console.log(`Variant ${variantId} prices:`, JSON.stringify(prices, null, 2))

    return prices
  } catch (error) {
    console.error("Error fetching variant prices:", error)
    throw error
  }
}

// Functie om cursussen op te halen van ClickFunnels API
export async function getCourses(bypassCache = false): Promise<Course[]> {
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

// Vervang de getClickFunnelsProducts functie met deze verbeterde versie

// Functie om producten op te halen van ClickFunnels API
export async function getClickFunnelsProducts(bypassCache = false): Promise<ClickFunnelsProduct[]> {
  try {
    const subdomain = CLICKFUNNELS_SUBDOMAIN
    const workspaceId = CLICKFUNNELS_NUMERIC_WORKSPACE_ID // Gebruik de numerieke workspace ID
    const apiToken = CLICKFUNNELS_API_TOKEN

    if (!subdomain || !apiToken) {
      console.error("ClickFunnels configuratie ontbreekt")
      console.log("CLICKFUNNELS_SUBDOMAIN:", subdomain)
      console.log("CLICKFUNNELS_API_TOKEN:", apiToken ? "Aanwezig" : "Ontbreekt")
      throw new Error("ClickFunnels configuratie ontbreekt")
    }

    // Log de API URL voor debugging
    console.log(`Fetching products from ClickFunnels API`)

    // Controleer of we een workspace ID hebben
    if (!workspaceId) {
      console.warn("CLICKFUNNELS_NUMERIC_WORKSPACE_ID ontbreekt, kan geen producten ophalen")
      return []
    }

    // Gebruik de workspace ID om producten op te halen
    console.log(`API URL: https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${workspaceId}/products`)
    const response = await fetch(`https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${workspaceId}/products`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`ClickFunnels Products API error: ${response.status}`)
      const errorText = await response.text()
      console.error(`Error response: ${errorText}`)

      // Als deze methode mislukt, retourneren we een lege array om de applicatie niet te laten crashen
      console.log("Returning empty products array as fallback")
      return []
    }

    const products: ClickFunnelsProduct[] = await response.json()
    console.log(`Successfully fetched ${products.length} products from ClickFunnels`)

    // Haal nu de varianten en prijzen op voor elk product
    const productsWithDetails = await Promise.all(
      products.map(async (product) => {
        try {
          // Haal varianten op
          console.log(`Fetching variants for product ${product.id}`)
          const variants = await getProductVariants(product.id.toString())

          // Haal prijzen op voor elke variant
          const variantsWithPrices = await Promise.all(
            variants.map(async (variant) => {
              try {
                console.log(`Fetching prices for variant ${variant.id}`)
                const prices = await getVariantPrices(variant.id)
                return {
                  ...variant,
                  prices,
                }
              } catch (error) {
                console.error(`Error fetching prices for variant ${variant.id}:`, error)
                return variant
              }
            }),
          )

          // Combineer alle prijzen
          const allPrices = variantsWithPrices
            .filter((variant) => variant.prices && variant.prices.length > 0)
            .flatMap((variant) => variant.prices)

          // Voeg default variant en prijs toe
          let defaultVariant = null
          if (product.default_variant_id) {
            defaultVariant = variantsWithPrices.find((v) => v.id === product.default_variant_id) || null
          }

          return {
            ...product,
            variants: variantsWithPrices,
            variant: defaultVariant,
            prices: allPrices,
            defaultPrice: defaultVariant?.prices?.[0] || null,
          }
        } catch (error) {
          console.error(`Error fetching details for product ${product.id}:`, error)
          return product
        }
      }),
    )

    return productsWithDetails
  } catch (error) {
    console.error("Error fetching ClickFunnels products:", error)
    // Retourneer een lege array om de applicatie niet te laten crashen
    return []
  }
}

// Functie om dashboard statistieken op te halen
export async function getDashboardStats(bypassCache = false): Promise<DashboardStats> {
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

    // Verbeterde foutafhandeling voor Stripe API-aanroepen
    let successfulPayments: any[] = []
    let paymentTrend = 0
    let enrollmentCount = 0
    let enrollmentTrend = 0

    try {
      console.log("Fetching payment intents from Stripe API...")

      // Controleer of stripe correct is geïnitialiseerd
      if (!stripe) {
        throw new Error("Stripe is not initialized")
      }

      // Haal alle betalingen op van de afgelopen 30 dagen met verbeterde foutafhandeling
      const allPayments = await stripe.paymentIntents
        .list({
          created: { gte: thirtyDaysAgo },
          limit: 100,
        })
        .catch((error) => {
          console.error("Error fetching payment intents from Stripe:", error)
          throw new Error(`Stripe API error: ${error.message}`)
        })

      // Filter op succesvolle betalingen
      successfulPayments = allPayments.data.filter((payment) => payment.status === "succeeded")

      // Bereken trends (laatste 7 dagen vs. de 7 dagen daarvoor)
      const recentPayments = successfulPayments.filter((payment) => payment.created >= sevenDaysAgo)
      const olderPayments = successfulPayments.filter(
        (payment) => payment.created < sevenDaysAgo && payment.created >= thirtyDaysAgo - 7 * 24 * 60 * 60,
      )

      paymentTrend = recentPayments.length - olderPayments.length

      // Enrollments berekenen op basis van metadata in betalingen
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

      enrollmentTrend = recentEnrollments - olderEnrollments
    } catch (error) {
      console.error("Error processing Stripe data:", error)
      // We gaan door met de functie, maar met nulwaarden voor Stripe-gerelateerde statistieken
      successfulPayments = []
      paymentTrend = 0
      enrollmentCount = 0
      enrollmentTrend = 0
    }

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
export async function getRecentActivity(limit = 10, bypassCache = false): Promise<RecentActivity[]> {
  try {
    const activities: RecentActivity[] = []

    // Verbeterde foutafhandeling voor Stripe API-aanroepen
    try {
      console.log("Fetching recent payment intents from Stripe API...")

      // Controleer of stripe correct is geïnitialiseerd
      if (!stripe) {
        throw new Error("Stripe is not initialized")
      }

      // Haal recente betalingen op van Stripe met verbeterde foutafhandeling
      const recentPayments = await stripe.paymentIntents
        .list({
          limit: 25, // Haal er meer op dan we nodig hebben, omdat we ze gaan filteren
          expand: ["data.customer"],
        })
        .catch((error) => {
          console.error("Error fetching payment intents from Stripe:", error)
          throw new Error(`Stripe API error: ${error.message}`)
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
          const formattedAmount = formatCurrency(payment.amount)
          const formattedDate = formatDate(new Date(payment.created * 1000))

          activities.push({
            id: payment.id,
            type: "payment",
            title: "Betaling ontvangen",
            description: `${formattedAmount} betaling ontvangen voor ${productName} van ${customerName}`,
            time: formattedDate,
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
                  time: formattedDate,
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
                time: formattedDate,
                timestamp: new Date(payment.created * 1000),
              })
            }
          }
        } else if (payment.status === "requires_payment_method" || payment.status === "canceled") {
          // Voeg mislukte betalingen toe
          const formattedAmount = formatCurrency(payment.amount)
          const formattedDate = formatDate(new Date(payment.created * 1000))

          activities.push({
            id: payment.id,
            type: "error",
            title: "Betaling mislukt",
            description: `Betaling van ${formattedAmount} is mislukt of geannuleerd`,
            time: formattedDate,
            timestamp: new Date(payment.created * 1000),
          })
        }
      }
    } catch (error) {
      console.error("Error processing Stripe activity data:", error)
      // We gaan door met een lege activiteitenlijst
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
export async function getRecentEnrollments(limit = 10, bypassCache = false): Promise<any[]> {
  try {
    // In een echte implementatie zou je dit uit je eigen database halen
    // Voor nu gebruiken we de Stripe betalingen als bron
    const enrollments: any[] = []

    // Verbeterde foutafhandeling voor Stripe API-aanroepen
    try {
      console.log("Fetching recent payment intents for enrollments from Stripe API...")

      // Controleer of stripe correct is geïnitialiseerd
      if (!stripe) {
        throw new Error("Stripe is not initialized")
      }

      // Haal recente betalingen op van Stripe met verbeterde foutafhandeling
      const recentPayments = await stripe.paymentIntents
        .list({
          limit: 25,
          expand: ["data.customer"],
        })
        .catch((error) => {
          console.error("Error fetching payment intents from Stripe:", error)
          throw new Error(`Stripe API error: ${error.message}`)
        })

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
            const formattedDate = formatDate(new Date(payment.created * 1000))

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
                date: formattedDate,
                timestamp: new Date(payment.created * 1000),
                status: "success",
              })
            }
          } catch (e) {
            // Als het geen geldige JSON is, voeg dan één enrollment toe
            const formattedDate = formatDate(new Date(payment.created * 1000))

            enrollments.push({
              id: `${payment.id}_enrollment`,
              name: customerName,
              email: customerEmail,
              course: "Onbekende cursus",
              courseId: "",
              date: formattedDate,
              timestamp: new Date(payment.created * 1000),
              status: "success",
            })
          }
        }
      }
    } catch (error) {
      console.error("Error processing Stripe enrollment data:", error)
      // We gaan door met een lege enrollments lijst
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
