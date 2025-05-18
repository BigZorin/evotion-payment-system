import { NextResponse } from "next/server"
import { getCoursesForProduct } from "@/lib/collections"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const url = new URL(request.url)
    const refresh = url.searchParams.get("refresh") === "true"

    console.log(`API: Fetching courses for product ID ${id}, refresh=${refresh}`)

    // Fetch courses for this product
    const courses = await getCoursesForProduct(id)

    console.log(`API: Found ${courses.length} courses for product ${id}`)

    return NextResponse.json({ courses })
  } catch (error) {
    console.error(`Error in /api/admin/products/${params.id}/courses-direct:`, error)
    return NextResponse.json({ error: "Failed to fetch courses", courses: [] }, { status: 500 })
  }
}
