"use server"

import type { ClickFunnelsCollection, CourseCollection } from "./types"
import { CLICKFUNNELS_API_TOKEN, CLICKFUNNELS_SUBDOMAIN, CLICKFUNNELS_WORKSPACE_ID } from "./config"

// Constante voor de prefix van cursus collections
export const COURSE_COLLECTION_PREFIX = "COURSE:"

// Functie om alle collections op te halen
export async function getClickFunnelsCollections(): Promise<ClickFunnelsCollection[]> {
  try {
    if (!CLICKFUNNELS_API_TOKEN || !CLICKFUNNELS_SUBDOMAIN || !CLICKFUNNELS_WORKSPACE_ID) {
      throw new Error("ClickFunnels configuratie ontbreekt")
    }

    console.log(`Fetching collections from ClickFunnels API`)
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/products/collections`
    console.log(`API URL: ${API_URL}`)

    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store", // Geen caching om altijd de meest recente data te krijgen
    })

    if (!response.ok) {
      console.error(`ClickFunnels API error: ${response.status} ${response.statusText}`)
      throw new Error(`ClickFunnels API error: ${response.status}`)
    }

    const collections = await response.json()
    return collections
  } catch (error) {
    console.error("Error fetching ClickFunnels collections:", error)
    throw error
  }
}

// Functie om een specifieke collection op te halen
export async function getClickFunnelsCollection(collectionId: number | string): Promise<ClickFunnelsCollection> {
  try {
    if (!CLICKFUNNELS_API_TOKEN || !CLICKFUNNELS_SUBDOMAIN) {
      throw new Error("ClickFunnels configuratie ontbreekt")
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
      console.error(`ClickFunnels API error: ${response.status} ${response.statusText}`)
      throw new Error(`ClickFunnels API error: ${response.status}`)
    }

    const collection = await response.json()
    return collection
  } catch (error) {
    console.error(`Error fetching ClickFunnels collection ${collectionId}:`, error)
    throw error
  }
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
  try {
    const allCollections = await getClickFunnelsCollections()

    // Filter collections die beginnen met de prefix
    const courseCollections = allCollections.filter(
      (collection) => collection.name && collection.name.startsWith(COURSE_COLLECTION_PREFIX),
    )

    // Map naar het CourseCollection formaat
    return courseCollections.map((collection) => {
      // Haal de cursusnaam uit de collection naam (verwijder de prefix)
      const courseName = collection.name.replace(COURSE_COLLECTION_PREFIX, "").trim()

      // Haal de cursus ID uit de description
      const courseId = extractCourseIdFromDescription(collection.description) || "unknown"

      return {
        collectionId: collection.id,
        collectionName: collection.name,
        courseId,
        courseName,
        productIds: collection.product_ids || [],
      }
    })
  } catch (error) {
    console.error("Error fetching course collections:", error)
    return []
  }
}

// Functie om alle cursussen voor een product op te halen
export async function getCoursesForProduct(productId: number | string): Promise<CourseCollection[]> {
  try {
    const courseCollections = await getCourseCollections()

    // Filter collections die dit product bevatten
    return courseCollections.filter((collection) => collection.productIds.includes(Number(productId)))
  } catch (error) {
    console.error(`Error fetching courses for product ${productId}:`, error)
    return []
  }
}

// Functie om alle producten voor een cursus op te halen
export async function getProductsForCourse(courseId: string): Promise<number[]> {
  try {
    const courseCollections = await getCourseCollections()

    // Zoek de collection voor deze cursus
    const courseCollection = courseCollections.find((collection) => collection.courseId === courseId)

    return courseCollection ? courseCollection.productIds : []
  } catch (error) {
    console.error(`Error fetching products for course ${courseId}:`, error)
    return []
  }
}

// Functie om een mapping te maken van cursus ID naar cursusnaam
export async function getCoursesMapping(): Promise<Record<string, string>> {
  try {
    const courseCollections = await getCourseCollections()

    // Maak een mapping van cursus ID naar cursusnaam
    const mapping: Record<string, string> = {}
    courseCollections.forEach((collection) => {
      if (collection.courseId) {
        mapping[collection.courseId] = collection.courseName
      }
    })

    return mapping
  } catch (error) {
    console.error("Error creating courses mapping:", error)
    return {}
  }
}
