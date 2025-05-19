"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ExternalLink, CreditCard, RefreshCw, BookOpen } from "lucide-react"
import Link from "next/link"
import { CopyButton } from "@/components/copy-button"
import { formatCurrency, formatPaymentPlanDetails, PaymentType, getValidPrices } from "@/lib/clickfunnels-helpers"

interface ProductDetailsProps {
  productId: string
  includeVariants?: boolean
  includePrices?: boolean
}

export function ProductDetails({ productId, includeVariants = true, includePrices = true }: ProductDetailsProps) {
  const [product, setProduct] = useState<any>(null)
  const [variants, setVariants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchProduct = async (refresh = false) => {
    try {
      setLoading(true)
      setError(null)
      if (refresh) setRefreshing(true)

      const queryParams = new URLSearchParams()
      if (includeVariants) queryParams.append("variants", "true")
      if (includePrices) queryParams.append("prices", "true")
      if (refresh) queryParams.append("refresh", "true")

      const response = await fetch(`/api/products/${productId}?${queryParams.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Fout bij ophalen product: ${response.status}`)
      }

      const data = await response.json()
      console.log("Product data received:", JSON.stringify(data, null, 2))
      setProduct(data.product)

      if (data.variants) {
        setVariants(data.variants)
      }
    } catch (err: any) {
      setError(err.message || "Er is een fout opgetreden bij het ophalen van het product")
      console.error("Error fetching product:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProduct()
  }, [productId])

  // Functie om een payment link te genereren
  const getPaymentLink = () => {
    // Check of het het 12-weken vetverlies programma is (op basis van naam)
    if (product?.name?.toLowerCase().includes("12-weken vetverlies")) {
      return `https://betalen.evotion-coaching.nl/checkout/12-weken-vetverlies`
    }

    // Voor andere producten, gebruik het product ID of public_id
    const id = product?.public_id || `cf-${product?.id}`
    return `https://betalen.evotion-coaching.nl/checkout/${id}`
  }

  // Functie om de product URL te bepalen
  const getProductUrl = () => {
    if (product?.current_path) {
      return `https://www.evotion-coaching.nl${product.current_path}`
    }

    // Check of het het 12-weken vetverlies programma is (op basis van naam)
    if (product?.name?.toLowerCase().includes("12-weken vetverlies")) {
      return "https://www.evotion-coaching.nl/product/12-weken-vetverlies-programma"
    }

    return `https://www.evotion-coaching.nl/products/${product?.public_id || product?.id}`
  }

  // Verzamel alle geldige variant prijzen (alleen betalingsplannen)
  const getVariantPrices = () => {
    if (!variants || variants.length === 0) return []

    // Filter op actieve varianten
    const activeVariants = variants.filter((variant) => !variant.archived)

    // Verzamel alle betalingsplan prijzen van de varianten
    const variantPrices: any[] = []

    activeVariants.forEach((variant: any) => {
      if (variant.prices && Array.isArray(variant.prices)) {
        // Filter op geldige prijzen en alleen betalingsplannen
        const validPrices = getValidPrices(variant.prices).filter(
          (price: any) => price.payment_type === PaymentType.PaymentPlan,
        )

        if (validPrices.length > 0) {
          validPrices.forEach((price: any) => {
            variantPrices.push({
              variantName: variant.name,
              variantId: variant.id,
              price: price,
            })
          })
        }
      }
    })

    return variantPrices
  }

  // Haal gekoppelde cursussen op
  const getLinkedCourses = () => {
    if (!product || !product.courses) return []
    return product.courses
  }

  if (loading && !product) {
    return (
      <Card className="border-[#1e1839]/10 shadow-sm">
        <CardHeader className="border-b border-[#1e1839]/10 bg-[#1e1839]/5 pb-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="pt-4">
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-20 w-full mb-4" />
        </CardContent>
        <CardFooter className="flex justify-between border-t border-[#1e1839]/10 pt-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </CardFooter>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200 text-red-800">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fout</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchProduct(true)}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Probeer opnieuw
        </Button>
      </Alert>
    )
  }

  if (!product) {
    return (
      <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-800">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Product niet gevonden</AlertTitle>
        <AlertDescription>Het product met ID {productId} kon niet worden gevonden.</AlertDescription>
      </Alert>
    )
  }

  const variantPrices = getVariantPrices()
  const hasVariantPrices = variantPrices.length > 0
  const linkedCourses = getLinkedCourses()
  const hasLinkedCourses = linkedCourses.length > 0
  const paymentLink = getPaymentLink()

  return (
    <Card className="border-[#1e1839]/10 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="border-b border-[#1e1839]/10 bg-[#1e1839]/5 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-[#1e1839]">NIEUWE VERSIE: {product.name}</CardTitle>
            <CardDescription className="text-[#1e1839]/60">{product.seo_description || ""}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => fetchProduct(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="sr-only">Vernieuwen</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {/* Betaallink sectie */}
        <div className="bg-[#1e1839]/5 p-3 rounded-md">
          <p className="text-sm font-medium text-[#1e1839] mb-1">Betaallink:</p>
          <div className="flex items-center gap-2">
            <code className="bg-white border border-[#1e1839]/20 text-[#1e1839] p-1.5 rounded text-xs flex-1 overflow-x-auto">
              {paymentLink}
            </code>
            <CopyButton
              text={paymentLink}
              size="icon"
              className="h-7 w-7 border-[#1e1839]/30 text-[#1e1839] hover:bg-[#1e1839] hover:text-white"
            />
          </div>
        </div>

        {/* Prijsvarianten sectie */}
        {hasVariantPrices ? (
          <div className="space-y-3">
            <h3 className="text-md font-semibold text-[#1e1839]">Beschikbare betalingsplannen</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {variantPrices.map((item, index) => (
                <div
                  key={`${item.variantId}-${item.price.id}`}
                  className="bg-amber-50/50 p-3 rounded-md border border-amber-200"
                >
                  <div className="mb-2">
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 mb-1">{item.variantName}</Badge>
                    <h4 className="font-semibold text-lg">{formatCurrency(item.price.amount, item.price.currency)}</h4>
                  </div>
                  {item.price.duration && item.price.interval && (
                    <p className="text-sm text-[#1e1839]/80 mb-2">{formatPaymentPlanDetails(item.price)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Alert>
            <AlertTitle>Geen betalingsplannen beschikbaar</AlertTitle>
            <AlertDescription>Er zijn momenteel geen betalingsplannen beschikbaar voor dit product.</AlertDescription>
          </Alert>
        )}

        {/* Gekoppelde cursussen sectie */}
        {hasLinkedCourses && (
          <div className="space-y-3">
            <h3 className="text-md font-semibold text-[#1e1839] flex items-center">
              <BookOpen className="h-4 w-4 mr-1.5" />
              Gekoppelde cursussen
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {linkedCourses.map((course: any, index: number) => (
                <div key={index} className="bg-purple-50/50 p-3 rounded-md border border-purple-200">
                  <h4 className="font-medium text-[#1e1839]">{course.courseName}</h4>
                  <p className="text-xs text-[#1e1839]/60 mt-1">ID: {course.courseId}</p>
                  <Badge className="mt-2 bg-purple-100 text-purple-700 border-purple-200">
                    {course.collectionName}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t border-[#1e1839]/10 pt-4">
        <Link href={getProductUrl()} target="_blank">
          <Button
            variant="outline"
            size="sm"
            className="border-[#1e1839] text-[#1e1839] hover:bg-[#1e1839] hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Bekijk Product
          </Button>
        </Link>
        <Link href={paymentLink} target="_blank">
          <Button
            size="sm"
            className="bg-white text-[#1e1839] hover:bg-[#1e1839] hover:text-white border border-[#1e1839]"
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Betalen
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
