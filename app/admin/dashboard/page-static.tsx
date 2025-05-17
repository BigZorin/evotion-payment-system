import AdminDashboardClient from "./client"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { products } from "@/lib/products"

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
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminDashboardClient
        initialStats={dashboardData.stats}
        initialRecentActivity={dashboardData.recentActivity}
        initialRecentEnrollments={dashboardData.recentEnrollments}
        initialCourses={dashboardData.courses}
        initialClickfunnelsProducts={dashboardData.clickfunnelsProducts}
        initialLocalProducts={dashboardData.localProducts}
      />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-4 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      <Skeleton className="h-10 w-64 mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  )
}
