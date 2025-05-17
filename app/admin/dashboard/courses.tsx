"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Course } from "@/lib/admin"

interface CoursesTabProps {
  initialCourses: Course[]
}

export default function CoursesTab({ initialCourses }: CoursesTabProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [isLoading, setIsLoading] = useState(false)

  // Functie om de cursus URL te bepalen
  const getCourseUrl = (course: Course) => {
    if (course.current_path) {
      return `https://www.evotion-coaching.nl${course.current_path}`
    }
    return `https://www.evotion-coaching.nl/community/c/${course.public_id || course.id}`
  }

  // Functie om een placeholder afbeelding te genereren als er geen afbeelding is
  const getImageUrl = (course: Course) => {
    if (course.image_url) {
      return course.image_url
    }
    return `/placeholder.svg?height=100&width=200&query=course`
  }

  return (
    <div className="space-y-8">
      {/* Cursussen overzicht */}
      <div className="bg-white border border-[#1e1839]/10 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-[#1e1839] mb-6">Alle Cursussen ({courses.length})</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.length > 0 ? (
              courses.map((course) => (
                <div
                  key={course.id}
                  className="border border-[#1e1839]/10 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  <div className="h-40 relative">
                    <Image
                      src={getImageUrl(course) || "/placeholder.svg"}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-[#1e1839] line-clamp-2">{course.title}</h3>
                      <Badge className="bg-[#1e1839] text-white hover:bg-[#1e1839]/90 ml-2 shrink-0">
                        ID: {course.public_id || course.id}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#1e1839]/70 mb-4 line-clamp-3">{course.description}</p>
                    <div className="flex justify-between items-center">
                      <Link href={getCourseUrl(course)} target="_blank">
                        <Button
                          size="sm"
                          className="bg-[#1e1839] text-white hover:bg-white hover:text-[#1e1839] hover:border-[#1e1839] border border-[#1e1839]"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Bekijk Cursus
                        </Button>
                      </Link>
                      <span className="text-xs text-[#1e1839]/60">
                        {course.created_at
                          ? new Date(course.created_at).toLocaleDateString("nl-NL")
                          : "Onbekende datum"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-[#1e1839]/60">Geen cursussen gevonden.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cursus statistieken */}
      <div className="bg-white border border-[#1e1839]/10 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-[#1e1839] mb-6">Cursus Statistieken</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1e1839]/5 rounded-lg p-4 text-center">
            <p className="text-sm text-[#1e1839]/70 mb-1">Totaal aantal cursussen</p>
            <p className="text-2xl font-bold text-[#1e1839]">{courses.length}</p>
          </div>
          <div className="bg-[#1e1839]/5 rounded-lg p-4 text-center">
            <p className="text-sm text-[#1e1839]/70 mb-1">Gepubliceerde cursussen</p>
            <p className="text-2xl font-bold text-[#1e1839]">
              {courses.filter((course) => course.published_at).length}
            </p>
          </div>
          <div className="bg-[#1e1839]/5 rounded-lg p-4 text-center">
            <p className="text-sm text-[#1e1839]/70 mb-1">Nieuwste cursus</p>
            <p className="text-lg font-bold text-[#1e1839] truncate">
              {courses.length > 0
                ? courses.sort(
                    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
                  )[0].title
                : "Geen cursussen"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
