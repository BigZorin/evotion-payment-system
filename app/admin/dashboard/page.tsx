import { products } from "@/lib/products"
import AdminDashboardClient from "./client"

// Gebruik export const dynamic = 'force-static' om de pagina statisch te genereren
export const dynamic = "force-static"

export default function AdminDashboard() {
  // Gebruik statische fallback data
  const dashboardData = {
    stats: {
      products: { total: products.length, trend: 0, trendLabel: "sinds vorige maand" },
      courses: { total: 3, trend: 0, trendLabel: "sinds vorige maand" },
      payments: { total: 0, trend: 0, trendLabel: "sinds vorige week" },
      enrollments: { total: 0, trend: 0, trendLabel: "sinds vorige week" },
    },
    recentActivity: [],
    recentEnrollments: [],
    courses: [],
    clickfunnelsProducts: [],
    localProducts: products,
  }

  return (
    <AdminDashboardClient
      initialStats={dashboardData.stats}
      initialRecentActivity={dashboardData.recentActivity}
      initialRecentEnrollments={dashboardData.recentEnrollments}
      initialCourses={dashboardData.courses}
      initialClickfunnelsProducts={dashboardData.clickfunnelsProducts}
      initialLocalProducts={dashboardData.localProducts}
    />
  )
}
