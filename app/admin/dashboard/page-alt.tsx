import { after } from "next/server"
import AdminDashboardClient from "./client"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { products } from "@/lib/products"

export default async function AdminDashboard() {
  // Gebruik een leeg object als fallback data
  const fallbackData = {
    stats: {
      products: { total: 0, trend: 0, trendLabel: "sinds vorige maand" },
      courses: { total: 0, trend: 0, trendLabel: "sinds vorige maand" },
      payments: { total: 0, trend: 0, trendLabel: "sinds vorige week" },
      enrollments: { total: 0, trend: 0, trendLabel: "sinds vorige week" },
    },
    recentActivity: [],
    recentEnrollments: [],
    courses: [],
    clickfunnelsProducts: [],
    localProducts: products,
  }

  // Gebruik de API route om data op te halen
  let dashboardData = fallbackData

  try {
    // Gebruik fetch om de API route aan te roepen
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/admin/dashboard`, {
      cache: "no-store",
    })

    if (response.ok) {
      dashboardData = await response.json()
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    // Gebruik fallback data bij een fout
  }

  // Gebruik after() om zware operaties uit te stellen
  after(() => {
    console.log("Dashboard rendered, performing background tasks...")
    // Hier kunnen we zware operaties uitvoeren die niet nodig zijn voor de initiële render
  })

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
