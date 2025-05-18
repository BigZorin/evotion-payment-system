import { Suspense } from "react"
import AdminDashboardClient from "./client"
import { products } from "@/lib/products"

// Forceer statische generatie om server functies niet tijdens render aan te roepen
export const dynamic = "force-static"

export default async function AdminDashboardPage() {
  // Gebruik statische fallback data voor de initiële render
  const initialStats = {
    products: { total: products.length, trend: 0, trendLabel: "sinds vorige maand" },
    courses: { total: 3, trend: 0, trendLabel: "sinds vorige maand" },
    payments: { total: 0, trend: 0, trendLabel: "sinds vorige week" },
    enrollments: { total: 0, trend: 0, trendLabel: "sinds vorige week" },
  }

  const initialRecentActivity = []
  const initialRecentEnrollments = []
  const initialCourses = []
  const initialClickfunnelsProducts = []

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboardClient
        initialStats={initialStats}
        initialRecentActivity={initialRecentActivity}
        initialRecentEnrollments={initialRecentEnrollments}
        initialCourses={initialCourses}
        initialClickfunnelsProducts={initialClickfunnelsProducts}
        initialLocalProducts={products}
      />
    </Suspense>
  )
}
