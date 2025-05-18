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

async function ApiTest() {
  const subdomain = CLICKFUNNELS_SUBDOMAIN
  const workspaceId = CLICKFUNNELS_WORKSPACE_ID
  const numericWorkspaceId = CLICKFUNNELS_NUMERIC_WORKSPACE_ID
  const apiToken = CLICKFUNNELS_API_TOKEN

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

  // Test collections API
  if (isConfigured) {
    try {
      const COLLECTIONS_API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${workspaceId}/collections`
      console.log(`Testing collections API: ${COLLECTIONS_API_URL}`)

      const collectionsResponse = await fetch(COLLECTIONS_API_URL, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      })

      if (!collectionsResponse.ok) {
        throw new Error(`API returned ${collectionsResponse.status} ${collectionsResponse.statusText}`)
      }

      collections = await collectionsResponse.json()
      console.log(`Successfully fetched ${collections.length} collections`)
    } catch (error) {
      console.error("Error fetching collections:", error)
      collectionsError = error.message
    }

    // Test products API met numerieke workspace ID
    try {
      const PRODUCTS_API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${numericWorkspaceId}/products`
      console.log(`Testing products API: ${PRODUCTS_API_URL}`)

      const productsResponse = await fetch(PRODUCTS_API_URL, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      })

      if (!productsResponse.ok) {
        throw new Error(`API returned ${productsResponse.status} ${productsResponse.statusText}`)
      }

      products = await productsResponse.json()
      console.log(`Successfully fetched ${products.length} products`)
    } catch (error) {
      console.error("Error fetching products:", error)
      productsError = error.message
    }

    // Test courses API
    try {
      const COURSES_API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${workspaceId}/courses`
      console.log(`Testing courses API: ${COURSES_API_URL}`)

      const coursesResponse = await fetch(COURSES_API_URL, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      })

      if (!coursesResponse.ok) {
        throw new Error(`API returned ${coursesResponse.status} ${coursesResponse.statusText}`)
      }

      courses = await coursesResponse.json()
      console.log(`Successfully fetched ${courses.length} courses`)
    } catch (error) {
      console.error("Error fetching courses:", error)
      coursesError = error.message

      // Als courses API faalt, probeer memberships API
      try {
        const MEMBERSHIPS_API_URL = `https://${subdomain}.myclickfunnels.com/api/v2/workspaces/${workspaceId}/memberships`
        console.log(`Testing memberships API: ${MEMBERSHIPS_API_URL}`)

        const membershipsResponse = await fetch(MEMBERSHIPS_API_URL, {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        })

        if (!membershipsResponse.ok) {
          throw new Error(`API returned ${membershipsResponse.status} ${membershipsResponse.statusText}`)
        }

        memberships = await membershipsResponse.json()
        console.log(`Successfully fetched ${memberships.length} memberships`)
      } catch (error) {
        console.error("Error fetching memberships:", error)
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
            <p className="font-medium">API Token: {apiToken ? "✅ Geconfigureerd" : "❌ Ontbreekt"}</p>
            <p className="font-medium">Subdomain: {subdomain ? `✅ ${subdomain}` : "❌ Ontbreekt"}</p>
            <p className="font-medium">Workspace ID: {workspaceId ? `✅ ${workspaceId}` : "❌ Ontbreekt"}</p>
            <p className="font-medium">
              Numerieke Workspace ID: {numericWorkspaceId ? `✅ ${numericWorkspaceId}` : "❌ Ontbreekt"}
            </p>
          </div>
          <div>
            <p className="font-medium">API URL Voorbeeld:</p>
            <p className="text-sm text-gray-600 break-all">
              https://{subdomain || "subdomain"}.myclickfunnels.com/api/v2/workspaces/
              {numericWorkspaceId || "workspace_id"}/products
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
                  <p className="text-sm text-gray-600">ID: {collection.id}</p>
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
                  <p className="text-sm text-gray-600">ID: {product.id}</p>
                  {product.default_variant_id && (
                    <p className="text-sm text-gray-600">Default Variant ID: {product.default_variant_id}</p>
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
                  <p className="text-sm text-gray-600">ID: {course.id}</p>
                  {course.public_id && <p className="text-sm text-gray-600">Public ID: {course.public_id}</p>}
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
                  <p className="text-sm text-gray-600">ID: {membership.id}</p>
                  {membership.public_id && <p className="text-sm text-gray-600">Public ID: {membership.public_id}</p>}
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
