import { NextResponse } from "next/server"
import {
  getDashboardStats,
  getRecentActivity,
  getRecentEnrollments,
  getCourses,
  getClickFunnelsProducts,
} from "@/lib/admin"
import { products } from "@/lib/products"

export async function GET() {
  try {
    // Haal alle benodigde data op
    const stats = await getDashboardStats()
    const recentActivity = await getRecentActivity(5)
    const recentEnrollments = await getRecentEnrollments(5)
    const courses = await getCourses()
    const clickfunnelsProducts = await getClickFunnelsProducts()

    // Retourneer alle data in één response
    return NextResponse.json({
      stats,
      recentActivity,
      recentEnrollments,
      courses,
      clickfunnelsProducts,
      localProducts: products,
    })
  } catch (error) {
    console.error("Error in dashboard API route:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het ophalen van de dashboard gegevens" },
      { status: 500 },
    )
  }
}
