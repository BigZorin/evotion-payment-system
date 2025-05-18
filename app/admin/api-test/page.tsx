export const dynamic = "force-dynamic"

import { Suspense } from "react"
import {
  CLICKFUNNELS_API_TOKEN,
  CLICKFUNNELS_SUBDOMAIN,
  CLICKFUNNELS_WORKSPACE_ID,
  CLICKFUNNELS_NUMERIC_WORKSPACE_ID,
} from "@/lib/config"

export default function ApiTestPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">ClickFunnels API Test</h1>

      <Suspense fallback={<div>Loading API test...</div>}>
        <ApiTest />
      </Suspense>
    </div>
  )
}

// Functie om gevoelige gegevens te maskeren
function maskSensitiveData(value: any, visibleStart = 3, visibleEnd = 2): string {
  // Convert value to string and handle null/undefined
  const strValue = value?.toString() || ""

  // If empty string, return empty string
  if (!strValue) return ""

  // If string is too short, mask most of it
  if (strValue.length <= visibleStart + visibleEnd) {
    return strValue.substring(0, Math.min(2, strValue.length)) + "***"
  }

  const start = strValue.substring(0, visibleStart)
  const end = strValue.substring(strValue.length - visibleEnd)
  return `${start}***${end}`
}

async function ApiTest() {
  const subdomain = CLICKFUNNELS_SUBDOMAIN
  const workspaceId = CLICKFUNNELS_WORKSPACE_ID
  const numericWorkspaceId = CLICKFUNNELS_NUMERIC_WORKSPACE_ID
  const apiToken = CLICKFUNNELS_API_TOKEN

  // Gemaskeerde versies voor weergave
  const maskedSubdomain = maskSensitiveData(subdomain, 3, 0)
  const maskedWorkspaceId = maskSensitiveData(workspaceId, 3, 3)
  const maskedNumericWorkspaceId = maskSensitiveData(numericWorkspaceId?.toString() || "", 2, 2)
  const maskedApiToken = apiToken ? maskSensitiveData(apiToken, 4, 4) : ""

  // Test API configuratie
  const isConfigured = !!subdomain && !!workspaceId && !!apiToken && !!numericWorkspaceId

  // Test API endpoints
  let collections = []
  let collectionsError = null
  let products = []
  let productsError = null
  let courses = []
  let coursesError = null
  let memberships = []
  let membershipsError = null

  // Helper functie om API-aanroepen te doen met betere foutafhandeling
  async function fetchWithErrorHandling(url: string, options: RequestInit, errorPrefix: string) {
    try {
      console.log(`Testing API: ${url}`)
      const response = await fetch(url, options)

      if (!response.ok) {
        // Controleer op rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After") || "60"
          throw new Error(`Rate limit overschreden. Probeer opnieuw na ${retryAfter} seconden.`)
        }

        // Andere HTTP fouten
        const errorText = await response.text()
        const errorMessage = errorText.length > 100 ? `${errorText.substring(0, 100)}...` : errorText
        throw new Error(`API returned ${response.status} ${response.statusText}: ${errorMessage}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`${errorPrefix}:`, error)
      throw error
    }
  }

  // Test collections API met verbeterde foutafhandeling
  if (isConfigured) {
    try {
      const COLLECTIONS_API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${numericWorkspaceId}/products/collections`
      const options = {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      }

      try {
        collections = await fetchWithErrorHandling(COLLECTIONS_API_URL, options, "Error fetching collections")
        console.log(`Successfully fetched ${collections.length} collections`)
      } catch (error) {
        // Als de eerste URL niet werkt, probeer een alternatieve URL
        console.log("First collections endpoint failed, trying alternative...")
        const ALT_COLLECTIONS_API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/products/collections`

        collections = await fetchWithErrorHandling(
          ALT_COLLECTIONS_API_URL,
          options,
          "Error fetching collections from alternative endpoint",
        )
        console.log(`Successfully fetched ${collections.length} collections from alternative endpoint`)
      }
    } catch (error) {
      collectionsError = error.message
    }

    // Wacht 1 seconde tussen API-aanroepen om rate limiting te voorkomen
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Test products API met numerieke workspace ID
    try {
      const PRODUCTS_API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${numericWorkspaceId}/products`

      products = await fetchWithErrorHandling(
        PRODUCTS_API_URL,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            Accept: "application/json",
          },
          next: { revalidate: 60 },
        },
        "Error fetching products",
      )
      console.log(`Successfully fetched ${products.length} products`)
    } catch (error) {
      productsError = error.message
    }

    // Wacht 1 seconde tussen API-aanroepen om rate limiting te voorkomen
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Test courses API
    try {
      const COURSES_API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${workspaceId}/courses`

      courses = await fetchWithErrorHandling(
        COURSES_API_URL,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            Accept: "application/json",
          },
          next: { revalidate: 60 },
        },
        "Error fetching courses",
      )
      console.log(`Successfully fetched ${courses.length} courses`)
    } catch (error) {
      coursesError = error.message

      // Wacht 1 seconde tussen API-aanroepen om rate limiting te voorkomen
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Als courses API faalt, probeer memberships API
      try {
        const MEMBERSHIPS_API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${workspaceId}/memberships`

        memberships = await fetchWithErrorHandling(
          MEMBERSHIPS_API_URL,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
              Accept: "application/json",
            },
            next: { revalidate: 60 },
          },
          "Error fetching memberships",
        )
        console.log(`Successfully fetched ${memberships.length} memberships`)
      } catch (error) {
        membershipsError = error.message
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* API Configuratie */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">API Configuratie</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-medium">API Token: {apiToken ? `✅ ${maskedApiToken}` : "❌ Ontbreekt"}</p>
            <p className="font-medium">Subdomain: {subdomain ? `✅ ${maskedSubdomain}` : "❌ Ontbreekt"}</p>
            <p className="font-medium">Workspace ID: {workspaceId ? `✅ ${maskedWorkspaceId}` : "❌ Ontbreekt"}</p>
            <p className="font-medium">
              Numerieke Workspace ID: {numericWorkspaceId ? `✅ ${maskedNumericWorkspaceId}` : "❌ Ontbreekt"}
            </p>
          </div>
          <div>
            <p className="font-medium">API URL Voorbeeld:</p>
            <p className="text-sm text-gray-600 break-all">
              https://{maskedSubdomain || "subdomain"}.myclickfunnels.com/api/v2/workspaces/
              {maskedNumericWorkspaceId || "workspace_id"}/products
            </p>
          </div>
        </div>
        {!isConfigured && (
          <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-md">
            <p className="font-medium">⚠️ API configuratie is onvolledig. Controleer de environment variables.</p>
          </div>
        )}
      </div>

      {/* Collections Test */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Collections API Test</h2>
        {collectionsError ? (
          <div className="p-4 bg-red-50 text-red-800 rounded-md">
            <p className="font-medium">❌ Fout bij het ophalen van collections:</p>
            <p className="text-sm">{collectionsError}</p>
          </div>
        ) : collections.length > 0 ? (
          <div>
            <p className="text-green-600 font-medium mb-4">✅ Succesvol {collections.length} collections opgehaald</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.slice(0, 6).map((collection) => (
                <div key={collection.id} className="border p-3 rounded-md">
                  <p className="font-medium">{collection.name || "Naamloze collectie"}</p>
                  <p className="text-sm text-gray-600">ID: {maskSensitiveData(collection.id, 3, 3)}</p>
                </div>
              ))}
            </div>
            {collections.length > 6 && (
              <p className="mt-4 text-sm text-gray-600">+ {collections.length - 6} meer collections...</p>
            )}
          </div>
        ) : (
          <p>Geen collections gevonden of API niet geconfigureerd.</p>
        )}
      </div>

      {/* Products Test */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Products API Test (met numerieke Workspace ID)</h2>
        {productsError ? (
          <div className="p-4 bg-red-50 text-red-800 rounded-md">
            <p className="font-medium">❌ Fout bij het ophalen van producten:</p>
            <p className="text-sm">{productsError}</p>
          </div>
        ) : products.length > 0 ? (
          <div>
            <p className="text-green-600 font-medium mb-4">✅ Succesvol {products.length} producten opgehaald</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.slice(0, 6).map((product) => (
                <div key={product.id} className="border p-3 rounded-md">
                  <p className="font-medium">{product.name || "Naamloos product"}</p>
                  <p className="text-sm text-gray-600">ID: {maskSensitiveData(product.id, 3, 3)}</p>
                  {product.default_variant_id && (
                    <p className="text-sm text-gray-600">
                      Default Variant ID: {maskSensitiveData(product.default_variant_id, 3, 3)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {products.length > 6 && (
              <p className="mt-4 text-sm text-gray-600">+ {products.length - 6} meer producten...</p>
            )}
          </div>
        ) : (
          <p>Geen producten gevonden of API niet geconfigureerd.</p>
        )}
      </div>

      {/* Courses/Memberships Test */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Cursussen/Memberships API Test</h2>
        {coursesError && membershipsError ? (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
            <p className="font-medium">⚠️ Kon geen cursussen of memberships ophalen.</p>
            <p className="text-sm">Dit kan normaal zijn als je ClickFunnels plan geen cursussen ondersteunt.</p>
            <p className="text-sm mt-2">Cursussen fout: {coursesError}</p>
            <p className="text-sm">Memberships fout: {membershipsError}</p>
          </div>
        ) : courses.length > 0 ? (
          <div>
            <p className="text-green-600 font-medium mb-4">✅ Succesvol {courses.length} cursussen opgehaald</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.slice(0, 6).map((course) => (
                <div key={course.id} className="border p-3 rounded-md">
                  <p className="font-medium">{course.title || course.name || "Naamloze cursus"}</p>
                  <p className="text-sm text-gray-600">ID: {maskSensitiveData(course.id, 3, 3)}</p>
                  {course.public_id && (
                    <p className="text-sm text-gray-600">Public ID: {maskSensitiveData(course.public_id, 3, 3)}</p>
                  )}
                </div>
              ))}
            </div>
            {courses.length > 6 && (
              <p className="mt-4 text-sm text-gray-600">+ {courses.length - 6} meer cursussen...</p>
            )}
          </div>
        ) : memberships.length > 0 ? (
          <div>
            <p className="text-green-600 font-medium mb-4">✅ Succesvol {memberships.length} memberships opgehaald</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberships.slice(0, 6).map((membership) => (
                <div key={membership.id} className="border p-3 rounded-md">
                  <p className="font-medium">{membership.title || membership.name || "Naamloze membership"}</p>
                  <p className="text-sm text-gray-600">ID: {maskSensitiveData(membership.id, 3, 3)}</p>
                  {membership.public_id && (
                    <p className="text-sm text-gray-600">Public ID: {maskSensitiveData(membership.public_id, 3, 3)}</p>
                  )}
                </div>
              ))}
            </div>
            {memberships.length > 6 && (
              <p className="mt-4 text-sm text-gray-600">+ {memberships.length - 6} meer memberships...</p>
            )}
          </div>
        ) : (
          <p>Geen cursussen of memberships gevonden of API niet geconfigureerd.</p>
        )}
      </div>

      {/* Rate Limiting Waarschuwing */}
      <div className="bg-blue-50 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">API Rate Limiting Informatie</h2>
        <div className="text-blue-700">
          <p className="mb-2">
            <strong>⚠️ Let op:</strong> De ClickFunnels API heeft rate limiting. Als je te veel aanvragen doet in een
            korte tijd, krijg je een "Too Many Requests" (HTTP 429) fout.
          </p>
          <p className="mb-2">
            Deze pagina voert meerdere API-aanroepen uit met pauzes ertussen om rate limiting te voorkomen. Als je toch
            een rate limiting fout krijgt, wacht dan enkele minuten voordat je de pagina opnieuw laadt.
          </p>
          <p>
            Voor productiegebruik is het aan te raden om caching te implementeren en het aantal API-aanroepen te
            beperken.
          </p>
        </div>
      </div>

      {/* Navigatie */}
      <div className="flex flex-wrap gap-4 mt-8">
        <a
          href="/admin/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Terug naar Dashboard
        </a>
        <a
          href="/admin/api-test"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          Test opnieuw uitvoeren
        </a>
      </div>
    </div>
  )
}
