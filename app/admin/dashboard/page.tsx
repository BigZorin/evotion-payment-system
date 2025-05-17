"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ChevronRight, Clock } from "lucide-react"

import { Suspense } from "react"
import AdminDashboardClient from "./client"
import { Skeleton } from "@/components/ui/skeleton"
import { products } from "@/lib/products"
import {
  getDashboardStats,
  getRecentActivity,
  getRecentEnrollments,
  getCourses,
  getClickFunnelsProducts,
} from "@/lib/admin"

export default async function AdminDashboard() {
  // Haal data op met server components
  const stats = await getDashboardStats()
  const recentActivity = await getRecentActivity(5)
  const recentEnrollments = await getRecentEnrollments(5)
  const courses = await getCourses()
  const clickfunnelsProducts = await getClickFunnelsProducts()

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminDashboardClient
        initialStats={stats}
        initialRecentActivity={recentActivity}
        initialRecentEnrollments={recentEnrollments}
        initialCourses={courses}
        initialClickfunnelsProducts={clickfunnelsProducts}
        initialLocalProducts={products}
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

// Navigation Item Component
function NavItem({
  icon,
  label,
  active,
  onClick,
}: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        active ? "bg-white text-[#1e1839]" : "text-white hover:bg-white/10"
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {active && <ChevronRight className="h-4 w-4 ml-auto" />}
    </button>
  )
}

// Stat Card Component
function StatCard({
  icon,
  title,
  value,
  trend,
  trendLabel,
}: { icon: React.ReactNode; title: string; value: string; trend: string; trendLabel: string }) {
  const isPositive = trend.startsWith("+")

  return (
    <div className="bg-white border border-[#1e1839]/10 rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-4">
        <div className="bg-[#1e1839]/5 p-3 rounded-full">{icon}</div>
        <div>
          <p className="text-sm text-[#1e1839]/60">{title}</p>
          <p className="text-2xl font-bold text-[#1e1839]">{value}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center text-xs">
        <span className={isPositive ? "text-green-600" : "text-red-600"}>{trend}</span>
        <span className="text-[#1e1839]/60 ml-1">{trendLabel}</span>
      </div>
    </div>
  )
}

// Activity Item Component
function ActivityItem({
  icon,
  title,
  description,
  time,
}: { icon: React.ReactNode; title: string; description: string; time: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-[#1e1839]/5 last:border-0 last:pb-0">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="font-medium text-[#1e1839]">{title}</p>
        <p className="text-sm text-[#1e1839]/70">{description}</p>
      </div>
      <div className="flex items-center text-xs text-[#1e1839]/60">
        <Clock className="h-3 w-3 mr-1" />
        {time}
      </div>
    </div>
  )
}

// Quick Link Card Component
function QuickLinkCard({
  icon,
  title,
  description,
  linkText,
  linkUrl,
}: { icon: React.ReactNode; title: string; description: string; linkText: string; linkUrl: string }) {
  return (
    <div className="bg-white border border-[#1e1839]/10 rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-[#1e1839]/5 p-3 rounded-full">{icon}</div>
        <h3 className="font-semibold text-[#1e1839]">{title}</h3>
      </div>
      <p className="text-sm text-[#1e1839]/70 mb-4">{description}</p>
      <Link href={linkUrl}>
        <Button className="w-full bg-[#1e1839] text-white hover:bg-white hover:text-[#1e1839] hover:border-[#1e1839] border border-[#1e1839]">
          {linkText}
        </Button>
      </Link>
    </div>
  )
}

// Enrollment Row Component
function EnrollmentRow({
  name,
  email,
  course,
  date,
  status,
}: { name: string; email: string; course: string; date: string; status: "success" | "error" | "pending" }) {
  return (
    <tr>
      <td className="py-3 px-4">
        <div>
          <p className="font-medium text-[#1e1839]">{name}</p>
          <p className="text-xs text-[#1e1839]/60">{email}</p>
        </div>
      </td>
      <td className="py-3 px-4 text-[#1e1839]">{course}</td>
      <td className="py-3 px-4 text-[#1e1839]/70 text-sm">{date}</td>
      <td className="py-3 px-4">
        {status === "success" && (
          <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">Succesvol</Badge>
        )}
        {status === "error" && (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100">Mislukt</Badge>
        )}
        {status === "pending" && (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">In behandeling</Badge>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <Button
          size="sm"
          variant="outline"
          className="border-[#1e1839] text-[#1e1839] hover:bg-[#1e1839] hover:text-white"
        >
          Details
        </Button>
      </td>
    </tr>
  )
}

// Copy Button Component
function CopyButton({ text }: { text: string }) {
  return (
    <Button
      size="icon"
      variant="outline"
      className="border-[#1e1839] text-[#1e1839] hover:bg-[#1e1839] hover:text-white"
      onClick={() => {
        navigator.clipboard.writeText(text)
        // In een echte applicatie zou je hier een toast notification tonen
        alert("Gekopieerd naar klembord!")
      }}
    >
      <Copy className="h-4 w-4" />
      <span className="sr-only">Kopieer naar klembord</span>
    </Button>
  )
}
