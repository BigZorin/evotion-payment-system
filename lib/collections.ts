"use server"

import { CLICKFUNNELS_API_TOKEN, CLICKFUNNELS_SUBDOMAIN, CLICKFUNNELS_WORKSPACE_ID } from "./config"
import type { ClickFunnelsCollection, CourseCollection } from "./types"

// Functie om cursus ID uit de collection description te halen
function extractCourseIdFromDescription(description: string | null): string | null {
  if (!description) return null
  const match = description.match(/course[_]?id:([a-zA-Z0-9]+)/i)
  return match ? match[1] : null
}

// Functie om ClickFunnels collections op te halen
export async function getClickFunnelsCollections(): Promise<ClickFunnelsCollection[]> {
  try {
    if (!CLICKFUNNELS_API_TOKEN || !CLICKFUNNELS_SUBDOMAIN || !CLICKFUNNELS_WORKSPACE_ID) {
      console.error("ClickFunnels configuratie ontbreekt")
      return []
    }

    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/products/collections`

    console.log(`Calling ClickFunnels API: ${API_URL}`)

    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${CLICKFUNNELS_API_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`ClickFunnels API error: ${response.status} ${response.statusText}`)
      return []
    }

    const collections = await response.json()
    return collections
  } catch (error) {
    console.error("Error fetching ClickFunnels collections:", error)
    return []
  }
}

// Functie om cursus collections te verwerken
export async function getCourseCollections(): Promise<CourseCollection[]> {
  try {
    const collections = await getClickFunnelsCollections()

    // Filter collections die beginnen met "COURSE:"
    const courseCollections = collections.filter((collection) => collection.name?.startsWith("COURSE:"))

    // Map naar het CourseCollection formaat
    const courses: CourseCollection[] = courseCollections.map((collection) => {
      const courseName = collection.name.replace("COURSE:", "").trim()
      const courseId = extractCourseIdFromDescription(collection.description) || "unknown"
      const productIds = collection.product_ids || []

      return {
        collectionId: collection.id,
        collectionName: collection.name,
        courseId: courseId,
        courseName: courseName,
        productIds: productIds,
      }
    })

    return courses
  } catch (error) {
    console.error("Error processing course collections:", error)
    return []
  }
}

// Functie om cursussen voor een product op te halen
export async function getCoursesForProduct(productId: string): Promise<CourseCollection[]> {
  try {
    const collections = await getClickFunnelsCollections()

    // Filter collections die beginnen met "COURSE:"
    const courseCollections = collections.filter((collection) => collection.name?.startsWith("COURSE:"))

    // Filter collections die dit product bevatten
    const matchingCollections = courseCollections.filter((collection) =>
      collection.product_ids?.includes(Number(productId)),
    )

    // Map naar het CourseCollection formaat
    const courses: CourseCollection[] = matchingCollections.map((collection) => {
      const courseName = collection.name.replace("COURSE:", "").trim()
      const courseId = extractCourseIdFromDescription(collection.description) || "unknown"
      const productIds = collection.product_ids || []

      return {
        collectionId: collection.id,
        collectionName: collection.name,
        courseId: courseId,
        courseName: courseName,
        productIds: productIds,
      }
    })

    return courses
  } catch (error) {
    console.error("Error fetching courses for product:", error)
    return []
  }
}
