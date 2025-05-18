"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, Package } from "lucide-react"
import type { CourseCollection } from "@/lib/types"

export default function CourseCollections() {
  const [collections, setCollections] = useState<CourseCollection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCourseCollections() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/admin/courses/collections")

        if (!response.ok) {
          throw new Error(`Error fetching course collections: ${response.status}`)
        }

        const data = await response.json()
        setCollections(data.collections || [])
      } catch (err) {
        console.error("Error fetching course collections:", err)
        setError("Er is een fout opgetreden bij het ophalen van de cursus collections.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourseCollections()
  }, [])

  if (isLoading) {
    return (
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1e1839]">Cursus Collections</h2>
            <p className="text-[#1e1839]/70">Overzicht van cursussen en gekoppelde producten</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1e1839]">Cursus Collections</h2>
            <p className="text-[#1e1839]/70">Overzicht van cursussen en gekoppelde producten</p>
          </div>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1e1839]">Cursus Collections</h2>
          <p className="text-[#1e1839]/70">Overzicht van cursussen en gekoppelde producten</p>
        </div>
      </div>

      {collections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {collections.map((collection) => (
            <Card key={collection.collectionId} className="overflow-hidden border border-gray-200">
              <CardHeader className="bg-[#1e1839]/5 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {collection.courseName}
                    </CardTitle>
                    <CardDescription>Collection: {collection.collectionName}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    ID: {collection.courseId}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-[#1e1839] mb-2 flex items-center gap-1">
                  <Package className="h-4 w-4" /> Gekoppelde producten ({collection.productIds.length})
                </h4>
                {collection.productIds.length > 0 ? (
                  <div className="space-y-2">
                    {collection.productIds.map((productId) => (
                      <div key={productId} className="p-2 bg-gray-50 rounded-md">
                        <p className="text-sm">Product ID: {productId}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Geen producten gekoppeld aan deze cursus</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Geen cursus collections gevonden</p>
            <p className="text-sm text-gray-400 mt-1">
              Maak collections aan met de naam "COURSE: [Cursusnaam]" om cursussen te koppelen aan producten.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
