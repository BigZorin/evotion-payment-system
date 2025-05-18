"use server"

import {
  CLICKFUNNELS_API_TOKEN,
  CLICKFUNNELS_SUBDOMAIN,
  CLICKFUNNELS_WORKSPACE_ID,
  CLICKFUNNELS_NUMERIC_WORKSPACE_ID,
} from "./config"
import { stripe } from "./stripe-server"

export interface ApiEndpoint {
  name: string
  url: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  headers?: Record<string, string>
  description: string
  category: "clickfunnels" | "stripe" | "internal" | "other"
  testPayload?: any
}

export interface ApiStatusResult {
  endpoint: ApiEndpoint
  status: "online" | "offline" | "degraded" | "unknown"
  responseTime: number // in ms
  statusCode?: number
  message?: string
  timestamp: Date
  error?: string
}

// Definieer alle API endpoints die we willen monitoren
export const apiEndpoints: ApiEndpoint[] = [
  // ClickFunnels API endpoints
  {
    name: "ClickFunnels Products",
    url: `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_NUMERIC_WORKSPACE_ID}/products`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
      Accept: "application/json",
    },
    description: "Haalt alle producten op van ClickFunnels",
    category: "clickfunnels",
  },
  {
    name: "ClickFunnels Courses",
    url: `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/courses`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
      Accept: "application/json",
    },
    description: "Haalt alle cursussen op van ClickFunnels",
    category: "clickfunnels",
  },
  // Gecorrigeerde endpoint voor ClickFunnels Collections
  {
    name: "ClickFunnels Collections",
    url: `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/products/collections`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
      Accept: "application/json",
    },
    description: "Haalt alle productcollecties op van ClickFunnels",
    category: "clickfunnels",
  },

  // Stripe API endpoints (via server functions)
  {
    name: "Stripe Balance",
    url: "stripe/balance",
    method: "GET",
    description: "Controleert de Stripe balans (via server functie)",
    category: "stripe",
  },
  {
    name: "Stripe Products",
    url: "stripe/products",
    method: "GET",
    description: "Haalt Stripe producten op (via server functie)",
    category: "stripe",
  },
  {
    name: "Stripe Customers",
    url: "stripe/customers",
    method: "GET",
    description: "Haalt Stripe klanten op (via server functie)",
    category: "stripe",
  },

  // Interne API endpoints
  {
    name: "Dashboard API",
    url: "/api/admin/dashboard",
    method: "GET",
    description: "Dashboard data API",
    category: "internal",
  },
  {
    name: "Cache API",
    url: "/api/admin/cache",
    method: "GET",
    description: "Cache beheer API",
    category: "internal",
  },
]

// Functie om de status van een specifieke API endpoint te controleren
export async function checkApiStatus(endpoint: ApiEndpoint): Promise<ApiStatusResult> {
  const startTime = Date.now()
  let status: "online" | "offline" | "degraded" | "unknown" = "unknown"
  let statusCode: number | undefined = undefined
  let message: string | undefined = undefined
  let error: string | undefined = undefined

  try {
    // Voor Stripe endpoints gebruiken we de Stripe SDK
    if (endpoint.url.startsWith("stripe/")) {
      const stripeEndpoint = endpoint.url.replace("stripe/", "")

      switch (stripeEndpoint) {
        case "balance":
          const balance = await stripe.balance.retrieve()
          status = "online"
          message = `Beschikbaar saldo: ${formatCurrency(balance.available[0]?.amount || 0)}`
          break

        case "products":
          const products = await stripe.products.list({ limit: 5 })
          status = "online"
          message = `${products.data.length} producten gevonden`
          break

        case "customers":
          const customers = await stripe.customers.list({ limit: 5 })
          status = "online"
          message = `${customers.data.length} klanten gevonden`
          break

        default:
          status = "unknown"
          message = "Onbekende Stripe endpoint"
      }
    }
    // Voor alle andere endpoints gebruiken we fetch
    else {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: endpoint.headers,
        cache: "no-store",
      })

      statusCode = response.status

      if (response.ok) {
        status = "online"

        // Voor sommige endpoints willen we extra informatie tonen
        if (endpoint.category === "clickfunnels") {
          try {
            const data = await response.json()
            if (Array.isArray(data)) {
              message = `${data.length} items gevonden`
            } else {
              message = "Data succesvol opgehaald"
            }
          } catch (e) {
            message = "Data opgehaald, maar kon niet worden geparsed"
          }
        } else {
          message = "API is beschikbaar"
        }
      } else {
        status = "offline"
        message = `HTTP status: ${response.status} ${response.statusText}`

        try {
          const errorData = await response.text()
          error = errorData
        } catch (e) {
          // Ignore error parsing errors
        }
      }
    }
  } catch (e) {
    status = "offline"
    message = "Kon geen verbinding maken met API"
    error = e instanceof Error ? e.message : "Onbekende fout"
  }

  const responseTime = Date.now() - startTime

  // Als de responstijd > 1000ms is, maar de API wel online is, markeren we het als "degraded"
  if (status === "online" && responseTime > 1000) {
    status = "degraded"
    message = `${message} (trage responstijd: ${responseTime}ms)`
  }

  return {
    endpoint,
    status,
    responseTime,
    statusCode,
    message,
    timestamp: new Date(),
    error,
  }
}

// Functie om de status van alle API endpoints te controleren
export async function checkAllApiStatus(): Promise<ApiStatusResult[]> {
  const results = await Promise.all(apiEndpoints.map((endpoint) => checkApiStatus(endpoint)))

  return results
}

// Functie om de status van alle API endpoints per categorie te controleren
export async function checkApiStatusByCategory(category: string): Promise<ApiStatusResult[]> {
  const endpoints = apiEndpoints.filter((endpoint) => endpoint.category === category)

  const results = await Promise.all(endpoints.map((endpoint) => checkApiStatus(endpoint)))

  return results
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
