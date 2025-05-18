"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Copy, ExternalLink, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { ClickFunnelsProduct } from "@/lib/admin"
import type { CourseCollection } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

// Cursus mapping - dit zou idealiter uit een API komen, maar voor nu hardcoden we het
const COURSE_ID_TO_NAME: Record<string, string> = {
  eWbLVk: "12-Weken Vetverlies Programma",
  vgDnxN: "Uitleg van Oefeningen",
  JMaGxK: "Evotion-Coaching App Handleiding",
  "basic-course-1": "Basis Cursus",
  "premium-course-1": "Premium Cursus 1",
  "premium-course-2": "Premium Cursus 2",
  "vip-course-1": "VIP Cursus 1",
  "vip-course-2": "VIP Cursus 2",
  "vip-course-3": "VIP Cursus 3",
}

interface ProductDetailsProps {
  productId: string
  onBack: () => void
}

export default function ProductDetails({ productId, onBack }: ProductDetailsProps) {
  const [product, setProduct] = useState<ClickFunnelsProduct | null>(null)
  const [courses, setCourses] = useState<CourseCollection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProductDetails() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/admin/products/${productId}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Error fetching product: ${response.status}`)
        }

        const data = await response.json()
        console.log("Product details:", data)
        setProduct(data.product || data)
      } catch (err) {
        console.error("Error fetching product details:", err)
        setError("Er is een fout opgetreden bij het ophalen van de productgegevens.")
      } finally {
        setIsLoading(false)
      }
    }

    async function fetchProductCourses() {
      setIsLoadingCourses(true)

      try {
        const response = await fetch(`/api/admin/products/${productId}/courses`)

        if (!response.ok) {
          console.error(`Error fetching courses: ${response.status}`)
          return
        }

        const data = await response.json()
        console.log("Product courses:", data)
        setCourses(data.courses || [])
      } catch (err) {
        console.error("Error fetching product courses:", err)
      } finally {
        setIsLoadingCourses(false)
      }
    }

    if (productId) {
      fetchProductDetails()
      fetchProductCourses()
    }
  }, [productId])

  // Generate payment link
  const generatePaymentLink = (product: ClickFunnelsProduct) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    return `${baseUrl}/checkout/${product.id}`
  }

  // Copy link to clipboard
  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedLink(link)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  if (isLoading) {
    return (
      <div>
        <Button variant="ghost" className="mb-6" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Terug naar producten
        </Button>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" className="mb-6" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Terug naar producten
        </Button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!product) {
    return (
      <div>
        <Button variant="ghost" className="mb-6" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Terug naar producten
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Product niet gevonden</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const paymentLink = generatePaymentLink(product)
  const isCopied = copiedLink === paymentLink

  return (
    <div>
      <Button variant="ghost" className="mb-6" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Terug naar producten
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1e1839]">{product.name}</h2>
          <p className="text-[#1e1839]/70">Product ID: {product.id}</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            className="text-[#1e1839] border-[#1e1839] hover:bg-[#1e1839] hover:text-white"
            onClick={() => {
              window.open(paymentLink, "_blank")
            }}
          >
            Bekijk <ExternalLink className="ml-1 h-4 w-4" />
          </Button>
          <Button className="bg-[#1e1839] hover:bg-[#1e1839]/90">Bewerken</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Productgegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-[#1e1839]">Naam</p>
              <p className="text-sm text-gray-600">{product.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[#1e1839]">Public ID</p>
              <p className="text-sm text-gray-600">{product.public_id || "Niet beschikbaar"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[#1e1839]">Status</p>
              <div className="flex gap-2 mt-1">
                {product.visible_in_store && (
                  <Badge className="bg-green-50 text-green-700 border-green-200">Zichtbaar in winkel</Badge>
                )}
                {product.visible_in_customer_center && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200">Zichtbaar in klantomgeving</Badge>
                )}
                {product.archived && <Badge className="bg-gray-50 text-gray-700 border-gray-200">Gearchiveerd</Badge>}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[#1e1839]">Aangemaakt op</p>
              <p className="text-sm text-gray-600">
                {product.created_at ? new Date(product.created_at).toLocaleDateString("nl-NL") : "Onbekend"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[#1e1839]">Laatst bijgewerkt</p>
              <p className="text-sm text-gray-600">
                {product.updated_at ? new Date(product.updated_at).toLocaleDateString("nl-NL") : "Onbekend"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Card */}
        <Card>
          <CardHeader>
            <CardTitle>Prijzen en betaallinks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-[#1e1839]">Standaard prijs</p>
              <p className="text-lg font-semibold text-[#1e1839]">
                {product.defaultPrice
                  ? formatCurrency(product.defaultPrice.amount)
                  : product.prices && product.prices.length > 0
                    ? formatCurrency(product.prices[0].amount)
                    : "Prijs niet beschikbaar"}
              </p>
            </div>

            {product.prices && product.prices.length > 0 && (
              <div>
                <p className="text-sm font-medium text-[#1e1839] mb-2">Alle prijzen</p>
                <div className="space-y-2">
                  {product.prices.map((price, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                      <span className="text-sm">{price.name || `Prijs ${index + 1}`}</span>
                      <span className="font-medium">{formatCurrency(price.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4">
              <p className="text-sm font-medium text-[#1e1839] mb-2">Betaallink</p>
              <div className="flex items-center gap-2">
                <Input
                  value={paymentLink}
                  readOnly
                  className="text-sm bg-gray-50"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  size="icon"
                  variant="outline"
                  className={`flex-shrink-0 ${
                    isCopied
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "text-[#1e1839] border-[#1e1839] hover:bg-[#1e1839] hover:text-white"
                  }`}
                  onClick={() => copyToClipboard(paymentLink)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-[#1e1839] hover:bg-[#1e1839]/90"
              onClick={() => {
                window.open(paymentLink, "_blank")
              }}
            >
              Betaallink testen
            </Button>
          </CardFooter>
        </Card>

        {/* Courses Card - Collection Based */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cursussen</CardTitle>
              <CardDescription>Cursussen die bij dit product horen (via collections)</CardDescription>
            </div>
            <BookOpen className="h-5 w-5 text-[#1e1839]" />
          </CardHeader>
          <CardContent>
            {isLoadingCourses ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base">{course.courseName}</CardTitle>
                      <CardDescription>ID: {course.courseId}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <Badge className="mb-2 bg-purple-50 text-purple-700 border-purple-200">
                        Collection: {course.collectionName}
                      </Badge>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">Inbegrepen bij dit product</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 border border-dashed border-gray-200 rounded-md">
                <p>Geen cursussen gevonden voor dit product</p>
                <p className="text-sm mt-1">
                  Voeg dit product toe aan een collection met de naam "COURSE: [Cursusnaam]" om cursussen te koppelen.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variants Card */}
        {product.variants && product.variants.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Productvarianten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {product.variants.map((variant) => (
                  <Card key={variant.id} className="border border-gray-200">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base">{variant.name}</CardTitle>
                      <CardDescription>ID: {variant.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="text-sm">
                        <p className="font-medium text-[#1e1839]">Prijs:</p>
                        {variant.prices && variant.prices.length > 0 ? (
                          <p>{formatCurrency(variant.prices[0].amount)}</p>
                        ) : (
                          <p className="text-gray-500">Prijs niet beschikbaar</p>
                        )}
                      </div>
                      {variant.default && (
                        <Badge className="mt-2 bg-blue-50 text-blue-700 border-blue-200">Standaard variant</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
