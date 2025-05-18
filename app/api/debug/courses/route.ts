import { NextResponse } from "next/server"
import { getClickFunnelsCollections, getCourseCollections } from "@/lib/collections"

export async function GET(request: Request) {
  try {
    // Get the raw collections from ClickFunnels
    const collections = await getClickFunnelsCollections()

    // Get the processed course collections
    const courseCollections = await getCourseCollections()

    return NextResponse.json({
      success: true,
      rawCollections: collections,
      courseCollections: courseCollections,
      counts: {
        rawCollections: collections.length,
        courseCollections: courseCollections.length,
      },
    })
  } catch (error) {
    console.error("Error in debug/courses API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
