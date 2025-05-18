import { NextResponse } from "next/server"
import { CLICKFUNNELS_API_TOKEN, CLICKFUNNELS_SUBDOMAIN, CLICKFUNNELS_WORKSPACE_ID } from "@/lib/config"
import type { CourseCollection } from "@/lib/types"

// Constante voor de prefix van cursus collections
const COURSE_COLLECTION_PREFIX = "COURSE:"

// Functie om cursus ID uit de collection description te halen
function extractCourseIdFromDescription(description: string | null): string | null {
  if (!description) return null
  const match = description.match(/course[_]?id:([a-zA-Z0-9]+)/i)
  return match ? match[1] : null
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Controleer eerst of de ClickFunnels configuratie aanwezig is
    if (!CLICKFUNNELS_API_TOKEN || !CLICKFUNNELS_SUBDOMAIN || !CLICKFUNNELS_WORKSPACE_ID) {
      console.error("ClickFunnels configuratie ontbreekt")
      return NextResponse.json(
        {
          error: "ClickFunnels configuratie ontbreekt",
          details: "Controleer of de environment variables correct zijn ingesteld",
          configError: true,
        },
        { status: 500 },
      )
    }

    const { id } = params
    const url = new URL(request.url)
    const refresh = url.searchParams.get("refresh") === "true"

    if (!id) {
      return NextResponse.json({ error: "Product ID is vereist" }, { status: 400 })
    }

    const productId = Number(id)
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Ongeldig product ID" }, { status: 400 })
    }

    console.log(`Direct API route: Fetching collections for product ID: ${productId}`)

    // Haal alle collections op
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/products/collections`

    console.log(`Calling ClickFunnels API: ${API_URL}`)

    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store", // Geen caching op HTTP-niveau
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Geen foutdetails beschikbaar")
      console.error(`ClickFunnels API error: ${response.status} ${response.statusText}`)
      console.error(`Error details: ${errorText}`)

      return NextResponse.json(
        {
          error: `ClickFunnels API error: ${response.status}`,
          details: errorText,
          apiError: true,
        },
        { status: response.status },
      )
    }

    const collections = await response.json()
    console.log(`Retrieved ${collections.length} collections from ClickFunnels`)

    // Filter collections die beginnen met de prefix
    const courseCollections = collections.filter(
      (collection: any) => collection.name && collection.name.startsWith(COURSE_COLLECTION_PREFIX),
    )
    console.log(`Found ${courseCollections.length} course collections`)

    // Filter collections die dit product bevatten
    const matchingCollections = courseCollections.filter((collection: any) => {
      const productIds = Array.isArray(collection.product_ids) ? collection.product_ids : []
      return productIds.includes(productId)
    })
    console.log(`Found ${matchingCollections.length} collections for product ${productId}`)

    // Map naar het CourseCollection formaat
    const courses: CourseCollection[] = matchingCollections.map((collection: any) => {
      // Haal de cursusnaam uit de collection naam (verwijder de prefix)
      const courseName = collection.name.replace(COURSE_COLLECTION_PREFIX, "").trim()

      // Haal de cursus ID uit de description
      const courseId = extractCourseIdFromDescription(collection.description) || "unknown"

      // Ensure product_ids is always an array
      const productIds = Array.isArray(collection.product_ids) ? collection.product_ids : []

      return {
        collectionId: collection.id,
        collectionName: collection.name,
        courseId,
        courseName,
        productIds,
      }
    })

    return NextResponse.json({ courses })
  } catch (error) {
    console.error(`Error in direct courses API:`, error)
    return NextResponse.json(
      {
        error: "Onverwachte fout bij het ophalen van cursussen",
        details: error instanceof Error ? error.message : String(error),
        technicalError: true,
      },
      { status: 500 },
    )
  }
}
