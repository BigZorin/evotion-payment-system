import { NextResponse } from "next/server"
import { getCoursesForProduct } from "@/lib/collections"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Fetch courses for this product
    const courses = await getCoursesForProduct(id)

    return NextResponse.json({ courses })
  } catch (error) {
    console.error(`Error in /api/admin/products/${params.id}/courses:`, error)
    return NextResponse.json({ error: "Failed to fetch courses for product" }, { status: 500 })
  }
}
