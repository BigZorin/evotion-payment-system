import { NextResponse } from "next/server"
import type { CourseCollection } from "@/lib/types"

// Functie om een pseudo-willekeurige string te genereren op basis van een seed
function generateId(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Converteer naar een alfanumerieke string van 6 tekens
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  const absHash = Math.abs(hash)

  for (let i = 0; i < 6; i++) {
    result += chars.charAt((absHash + i) % chars.length)
  }

  return result
}

// Functie om cursussen te genereren op basis van product ID
function generateCoursesForProduct(productId: string): CourseCollection[] {
  const numId = Number.parseInt(productId, 10)

  // Basis cursussen die elk product heeft
  const courses: CourseCollection[] = [
    {
      collectionId: numId * 100 + 1,
      collectionName: "COURSE: Introductie tot het product",
      courseId: generateId(`intro-${productId}`),
      courseName: "Introductie tot het product",
      productIds: [numId],
    },
  ]

  // Voeg extra cursussen toe op basis van het product ID
  if (numId % 2 === 0) {
    // Even product IDs krijgen een basis cursus
    courses.push({
      collectionId: numId * 100 + 2,
      collectionName: "COURSE: Basis handleiding",
      courseId: generateId(`basis-${productId}`),
      courseName: "Basis handleiding",
      productIds: [numId],
    })
  }

  if (numId % 3 === 0) {
    // Product IDs deelbaar door 3 krijgen een gevorderde cursus
    courses.push({
      collectionId: numId * 100 + 3,
      collectionName: "COURSE: Gevorderde technieken",
      courseId: generateId(`advanced-${productId}`),
      courseName: "Gevorderde technieken",
      productIds: [numId],
    })
  }

  if (numId % 5 === 0) {
    // Product IDs deelbaar door 5 krijgen een expert cursus
    courses.push({
      collectionId: numId * 100 + 4,
      collectionName: "COURSE: Expert masterclass",
      courseId: generateId(`expert-${productId}`),
      courseName: "Expert masterclass",
      productIds: [numId],
    })
  }

  return courses
}

export async function GET(request: Request) {
  try {
    // Haal productId uit de query parameters
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")

    if (!productId) {
      return NextResponse.json({ error: "Product ID is vereist" }, { status: 400 })
    }

    console.log(`Simplified API: Generating courses for product ID: ${productId}`)

    // Genereer cursussen voor dit product
    const courses = generateCoursesForProduct(productId)

    console.log(`Simplified API: Generated ${courses.length} courses for product ${productId}`)

    // Voeg een kleine vertraging toe om een API-aanroep te simuleren
    await new Promise((resolve) => setTimeout(resolve, 300))

    return NextResponse.json({ courses })
  } catch (error) {
    console.error(`Error in simplified courses API:`, error)
    return NextResponse.json(
      {
        error: "Fout bij het ophalen van cursussen",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
