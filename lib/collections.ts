import type { ClickFunnelsCollection, CourseCollection } from "./types"
import {
  CLICKFUNNELS_API_TOKEN,
  CLICKFUNNELS_SUBDOMAIN,
  CLICKFUNNELS_WORKSPACE_ID,
  CLICKFUNNELS_NUMERIC_WORKSPACE_ID,
} from "./config"

// Constante voor de prefix van cursus collections
const COURSE_COLLECTION_PREFIX = "COURSE:"

// Functie om alle collections op te halen
export async function getClickFunnelsCollections(): Promise<ClickFunnelsCollection[]> {
  "use server"

  if (!CLICKFUNNELS_API_TOKEN || !CLICKFUNNELS_SUBDOMAIN || !CLICKFUNNELS_WORKSPACE_ID) {
    throw new Error("ClickFunnels configuratie ontbreekt. Controleer je environment variables.")
  }

  console.log(`Fetching collections from ClickFunnels API`)
  const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_NUMERIC_WORKSPACE_ID}/products/collections`
  console.log(`API URL: ${API_URL}`)

  const response = await fetch(API_URL, {
    headers: {
      Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    console.error(`ClickFunnels API error: ${response.status} ${response.statusText}`)

    // Probeer alternatieve URL zonder workspace ID
    console.log("Trying alternative collections endpoint...")
    const ALT_API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/collections`

    const altResponse = await fetch(ALT_API_URL, {
      headers: {
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!altResponse.ok) {
      const errorText = await altResponse.text().catch(() => "Geen foutdetails beschikbaar")
      console.error(`Alternative ClickFunnels API error: ${altResponse.status} ${altResponse.statusText}`)
      console.error(`Error details: ${errorText}`)
      throw new Error(`ClickFunnels API error: ${altResponse.status}. Controleer je API-toegang en credentials.`)
    }

    const collections = await altResponse.json()
    console.log(`Retrieved ${collections.length} collections from alternative endpoint`)
    return collections
  }

  const collections = await response.json()
  console.log(`Retrieved ${collections.length} collections from ClickFunnels`)
  return collections
}

// Functie om een specifieke collection op te halen
export async function getClickFunnelsCollection(collectionId: number | string): Promise<ClickFunnelsCollection> {
  "use server"

  if (!CLICKFUNNELS_API_TOKEN || !CLICKFUNNELS_SUBDOMAIN) {
    throw new Error("ClickFunnels configuratie ontbreekt. Controleer je environment variables.")
  }

  console.log(`Fetching collection with ID: ${collectionId}`)
  const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/products/collections/${collectionId}`
  console.log(`API URL: ${API_URL}`)

  const response = await fetch(API_URL, {
    headers: {
      Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Geen foutdetails beschikbaar")
    console.error(`ClickFunnels API error: ${response.status} ${response.statusText}`)
    console.error(`Error details: ${errorText}`)
    throw new Error(`ClickFunnels API error: ${response.status}. Controleer je API-toegang en credentials.`)
  }

  const collection = await response.json()
  return collection
}

// Functie om cursus ID uit de collection description te halen
export function extractCourseIdFromDescription(description: string | null): string | null {
  if (!description) return null

  // Zoek naar een patroon zoals "course_id:eWbLVk" of "courseId:eWbLVk"
  const match = description.match(/course[_]?id:([a-zA-Z0-9]+)/i)
  return match ? match[1] : null
}

// Functie om alle cursus collections op te halen
export async function getCourseCollections(): Promise<CourseCollection[]> {
  "use server"

  const allCollections = await getClickFunnelsCollections()
  console.log(`Retrieved ${allCollections.length} collections from ClickFunnels`)

  // Filter collections die beginnen met de prefix
  const courseCollections = allCollections.filter(
    (collection) => collection.name && collection.name.startsWith(COURSE_COLLECTION_PREFIX),
  )
  console.log(`Found ${courseCollections.length} course collections`)

  // Map naar het CourseCollection formaat
  return courseCollections.map((collection) => {
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
}

// Functie om alle cursussen voor een product op te halen
export async function getCoursesForProduct(productId: number | string): Promise<CourseCollection[]> {
  "use server"

  if (!productId) {
    throw new Error("Product ID is vereist")
  }

  console.log(`Getting courses for product ID: ${productId}`)

  const courseCollections = await getCourseCollections()
  console.log(`Retrieved ${courseCollections.length} course collections`)

  const numericProductId = Number(productId)

  if (isNaN(numericProductId)) {
    throw new Error(`Ongeldig product ID: ${productId} (geen nummer)`)
  }

  // Filter collections die dit product bevatten
  const matchingCollections = courseCollections.filter((collection) => {
    return Array.isArray(collection.productIds) && collection.productIds.includes(numericProductId)
  })

  console.log(`Found ${matchingCollections.length} collections for product ${productId}`)
  return matchingCollections
}

// Functie om alle producten voor een cursus op te halen
export async function getProductsForCourse(courseId: string): Promise<number[]> {
  "use server"

  if (!courseId) {
    throw new Error("Course ID is vereist")
  }

  const courseCollections = await getCourseCollections()

  // Zoek de collection voor deze cursus
  const courseCollection = courseCollections.find((collection) => collection.courseId === courseId)

  if (!courseCollection) {
    console.log(`No collection found for course ID: ${courseId}`)
    return []
  }

  return Array.isArray(courseCollection.productIds) ? courseCollection.productIds : []
}

// Functie om een mapping te maken van cursus ID naar cursusnaam
export async function getCoursesMapping(): Promise<Record<string, string>> {
  "use server"

  const courseCollections = await getCourseCollections()

  // Maak een mapping van cursus ID naar cursusnaam
  const mapping: Record<string, string> = {}
  courseCollections.forEach((collection) => {
    if (collection.courseId) {
      mapping[collection.courseId] = collection.courseName
    }
  })

  return mapping
}
