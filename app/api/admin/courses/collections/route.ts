import { NextResponse } from "next/server"
import { getCourseCollections } from "@/lib/collections"

export async function GET() {
  try {
    // Fetch all course collections
    const collections = await getCourseCollections()

    return NextResponse.json({ collections })
  } catch (error) {
    console.error("Error in /api/admin/courses/collections:", error)
    return NextResponse.json({ error: "Failed to fetch course collections" }, { status: 500 })
  }
}
