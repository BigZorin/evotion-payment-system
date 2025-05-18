import { NextResponse } from "next/server"
import {
  getDashboardStats,
  getRecentActivity,
  getRecentEnrollments,
  getCourses,
  getClickFunnelsProducts,
} from "@/lib/admin"
import { products } from "@/lib/products"
import { apiCache } from "@/lib/cache"

export async function GET(request: Request) {
  try {
    // Check if we need to bypass cache
    const url = new URL(request.url)
    const bypassCache = url.searchParams.get("refresh") === "true"

    if (bypassCache) {
      console.log("Bypassing cache and fetching fresh data")
      // Invalidate all cache
      apiCache.clear()
    }

    // Parallel data ophalen voor betere performance
    const [stats, recentActivity, recentEnrollments, courses, clickfunnelsProducts] = await Promise.all([
      getDashboardStats(bypassCache).catch((error) => {
        console.error("Error fetching dashboard stats:", error)
        return {
          products: { total: products.length, trend: 0, trendLabel: "sinds vorige maand" },
          courses: { total: 3, trend: 0, trendLabel: "sinds vorige maand" },
          payments: { total: 0, trend: 0, trendLabel: "sinds vorige week" },
          enrollments: { total: 0, trend: 0, trendLabel: "sinds vorige week" },
        }
      }),
      getRecentActivity(5, bypassCache).catch((error) => {
        console.error("Error fetching recent activity:", error)
        return []
      }),
      getRecentEnrollments(5, bypassCache).catch((error) => {
        console.error("Error fetching recent enrollments:", error)
        return []
      }),
      getCourses(bypassCache).catch((error) => {
        console.error("Error fetching courses:", error)
        return []
      }),
      getClickFunnelsProducts(bypassCache).catch((error) => {
        console.error("Error fetching ClickFunnels products:", error)
        return []
      }),
    ])

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
      {
        error: "Er is een fout opgetreden bij het ophalen van de dashboard gegevens",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
