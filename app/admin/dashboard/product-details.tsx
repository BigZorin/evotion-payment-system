"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, ExternalLink, RefreshCw, Copy, BookOpen, AlertCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatCurrency, PaymentType, getValidPrices } from "@/lib/clickfunnels-helpers"

interface ProductDetailsProps {
  productId: string
  onBack: () => void
}

export default function ProductDetails({ productId, onBack }: ProductDetailsProps) {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  useEffect(() => {
    fetchProductDetails()
  }, [productId])

  const fetchProductDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`Fetching product details for ID: ${productId}`)
      const response = await fetch(`/api/admin/products/${productId}?refresh=true`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Error response: ${errorText}`)
        throw new Error(`Error fetching product details: ${response.status}`)
      }

      const data = await response.json()
      console.log("Product details received:", data)
      setProduct(data)
    } catch (err) {
      console.error("Error loading product details:", err)
      setError("Er is een fout opgetreden bij het laden van de productgegevens.")
    } finally {
      setLoading(false)
    }
  }

  const refreshProductDetails = async () => {
    try {
      setRefreshing(true)
      setError(null)

      // Toon toast om aan te geven dat we aan het verversen zijn
      toast({
        title: "Product verversen",
        description: "Bezig met het ophalen van de laatste productgegevens...",
        duration: 3000,
      })

      // Voeg refresh=true parameter toe om de cache te omzeilen
      const response = await fetch(`/api/admin/products/${productId}?refresh=true`)

      if (!response.ok) {
        throw new Error(`Error refreshing product details: ${response.status}`)
      }

      const data = await response.json()
      console.log("Refreshed product details:", data)
      setProduct(data)

      // Toon succes toast
      toast({
        title: "Product ververst",
        description: "De productgegevens zijn succesvol bijgewerkt.",
        duration: 3000,
      })
    } catch (err) {
      console.error("Error refreshing product details:", err)
      setError("Er is een fout opgetreden bij het verversen van de productgegevens.")

      // Toon fout toast
      toast({
        title: "Fout bij verversen",
        description: "Er is een fout opgetreden bij het verversen van de productgegevens.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Generate payment link
  const generatePaymentLink = (product: any) => {
    // Check of het het 12-weken vetverlies programma is (op basis van naam)
    if (product?.name?.toLowerCase().includes("12-weken vetverlies")) {
      return `https://betalen.evotion-coaching.nl/checkout/12-weken-vetverlies`
    }

    // Voor andere producten, gebruik het product ID of public_id
    const id = product?.public_id || `cf-${product?.id}`
    return `https://betalen.evotion-coaching.nl/checkout/${id}`
  }

  // Copy link to clipboard
  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedLink(link)
    toast({
      title: "Link gekopieerd",
      description: "De betaallink is gekopieerd naar het klembord.",
      duration: 2000,
    })
    setTimeout(() => setCopiedLink(null), 2000)
  }

  // Verzamel alle geldige variant prijzen
  const getVariantPrices = () => {
    if (!product || !product.variants || product.variants.length === 0) return []

    // Filter op actieve varianten
    const activeVariants = product.variants.filter((variant: any) => !variant.archived)

    // Verzamel alle prijzen van de varianten
    const variantPrices: any[] = []

    activeVariants.forEach((variant: any) => {
      if (variant.prices && Array.isArray(variant.prices)) {
        // Filter op geldige prijzen
        const validPrices = getValidPrices(variant.prices)

        // Prioriteit geven aan betalingsplannen
        const paymentPlanPrices = validPrices.filter((price: any) => price.payment_type === PaymentType.PaymentPlan)

        // Als er betalingsplannen zijn, gebruik die, anders gebruik alle geldige prijzen
        const pricesToUse = paymentPlanPrices.length > 0 ? paymentPlanPrices : validPrices

        if (pricesToUse.length > 0) {
          pricesToUse.forEach((price: any) => {
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

  // Helper functie om interval label te vertalen
  const getIntervalLabel = (interval: string, count = 1): string => {
    const intervalMap: Record<string, [string, string]> = {
      day: ["dag", "dagen"],
      week: ["week", "weken"],
      month: ["maand", "maanden"],
      year: ["jaar", "jaar"],
    }

    const [singular, plural] = intervalMap[interval?.toLowerCase()] || ["periode", "periodes"]
    return count === 1 ? singular : plural
  }

  // Functie om betalingsplan details te formatteren
  const formatPaymentPlanDetails = (price: any): string => {
    if (!price || price.payment_type !== PaymentType.PaymentPlan) return ""

    // Log de prijs voor debugging
    console.log("Formatting payment plan details for price:", price)

    // Haal de benodigde gegevens op
    const amount = Number.parseFloat(price.amount || "0")
    const duration = Number.parseInt(price.duration || "3", 10)
    const interval = price.interval || "month"
    const intervalCount = Number.parseInt(price.interval_count || "1", 10)

    // Log de gegevens voor debugging
    console.log("Payment plan details:", {
      amount,
      duration,
      interval,
      intervalCount,
    })

    // Formateer het bedrag
    const formattedAmount = formatCurrency(amount, price.currency)

    // Bereken het totaalbedrag (elke termijn is het volledige bedrag)
    const totalAmount = amount * duration
    const formattedTotalAmount = formatCurrency(totalAmount, price.currency)

    // Bepaal de juiste intervaltekst
    const intervalLabel = getIntervalLabel(interval, intervalCount)

    // Bouw de betalingsplan details string
    let details = `${duration}x ${formattedAmount}`
    if (intervalCount === 1) {
      details += ` (per ${intervalLabel})`
    } else {
      details += ` (elke ${intervalCount} ${intervalLabel})`
    }

    // Voeg het totaalbedrag toe
    details += ` - Totaal: ${formattedTotalAmount}`

    return details
  }

  // Functie om abonnement details te formatteren
  const formatSubscriptionDetails = (price: any): string => {
    if (!price || price.payment_type !== PaymentType.Subscription) return ""

    // Log de prijs voor debugging
    console.log("Formatting subscription details for price:", price)

    // Haal de benodigde gegevens op
    const interval = price.interval || "month"
    const intervalCount = Number.parseInt(price.interval_count || "1", 10)

    // Log de gegevens voor debugging
    console.log("Subscription details:", {
      interval,
      intervalCount,
    })

    // Bepaal de juiste intervaltekst
    const intervalLabel = getIntervalLabel(interval, intervalCount)

    // Bouw de abonnement details string
    if (intervalCount === 1) {
      return `Per ${intervalLabel}`
    } else {
      return `Elke ${intervalCount} ${intervalLabel}`
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar producten
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar producten
          </Button>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Fout bij laden product</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={fetchProductDetails}>Probeer opnieuw</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar producten
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product niet gevonden</CardTitle>
            <CardDescription>Het product met ID {productId} kon niet worden gevonden.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={onBack}>Terug naar producten</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const paymentLink = generatePaymentLink(product)
  const isCopied = copiedLink === paymentLink
  const variantPrices = getVariantPrices()
  const hasVariantPrices = variantPrices.length > 0
  const linkedCourses = getLinkedCourses()
  const hasLinkedCourses = linkedCourses.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar producten
          </Button>
          <h2 className="text-2xl font-bold">{product.name}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={refreshProductDetails} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Verversen..." : "Verversen"}
        </Button>
      </div>

      {/* Eén overzichtelijke box met alle productgegevens */}
      <Card className="border-[#1e1839]/10 shadow-sm">
        <CardHeader className="border-b border-[#1e1839]/10 bg-[#1e1839]/5 pb-3">
          <CardTitle>Productoverzicht</CardTitle>
          <CardDescription>Alle belangrijke informatie over dit product</CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-6">
          {/* Productgegevens sectie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Product ID</h4>
              <p>{product.id}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Publieke ID</h4>
              <p>{product.public_id || "Geen publieke ID"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Status</h4>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant={product.archived ? "destructive" : "outline"}>
                  {product.archived ? "Gearchiveerd" : "Actief"}
                </Badge>
                <Badge variant={product.visible_in_store ? "default" : "outline"}>
                  {product.visible_in_store ? "Zichtbaar in winkel" : "Onzichtbaar in winkel"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Betaallink sectie */}
          <div className="bg-[#1e1839]/5 p-3 rounded-md">
            <p className="text-sm font-medium text-[#1e1839] mb-1">Betaallink:</p>
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

          {/* Prijsvarianten sectie */}
          {hasVariantPrices ? (
            <div className="space-y-3">
              <h3 className="text-md font-semibold text-[#1e1839]">Beschikbare prijzen</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {variantPrices.map((item, index) => {
                  const price = item.price

                  // Log de prijs voor debugging
                  console.log(`Rendering price card for price ID ${price?.id}:`, price)

                  const isPaymentPlan = price.payment_type === PaymentType.PaymentPlan
                  const isSubscription = price.payment_type === PaymentType.Subscription

                  let bgColorClass = "bg-gray-50/50"
                  let borderColorClass = "border-gray-200"

                  if (isPaymentPlan) {
                    bgColorClass = "bg-amber-50/50"
                    borderColorClass = "border-amber-200"
                  } else if (isSubscription) {
                    bgColorClass = "bg-blue-50/50"
                    borderColorClass = "border-blue-200"
                  }

                  // Bepaal de betalingsdetails
                  let paymentDetails = ""
                  if (isPaymentPlan) {
                    paymentDetails = formatPaymentPlanDetails(price)
                  } else if (isSubscription) {
                    paymentDetails = formatSubscriptionDetails(price)
                  }

                  return (
                    <div
                      key={`${item.variantId}-${price.id}`}
                      className={`${bgColorClass} p-3 rounded-md border ${borderColorClass}`}
                    >
                      <div className="mb-2">
                        <Badge className="mb-1">{item.variantName}</Badge>
                        <h4 className="font-semibold text-lg">{formatCurrency(price.amount, price.currency)}</h4>
                      </div>

                      {paymentDetails && <p className="text-sm text-[#1e1839]/80 mb-2">{paymentDetails}</p>}

                      <div className="text-xs text-[#1e1839]/60">
                        <p>ID: {price.id}</p>
                        <p>Type: {price.payment_type || "one_time"}</p>
                        {isPaymentPlan && (
                          <>
                            <p>Duur: {price.duration || "3"} termijnen</p>
                            <p>
                              Interval: {price.interval_count || "1"}{" "}
                              {getIntervalLabel(price.interval || "month", price.interval_count || 1)}
                            </p>
                          </>
                        )}
                        {isSubscription && (
                          <p>
                            Interval: {price.interval_count || "1"}{" "}
                            {getIntervalLabel(price.interval || "month", price.interval_count || 1)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Geen prijzen beschikbaar</AlertTitle>
              <AlertDescription>Er zijn momenteel geen actieve prijzen beschikbaar voor dit product.</AlertDescription>
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
          <Button
            variant="outline"
            className="text-[#1e1839] border-[#1e1839] hover:bg-[#1e1839] hover:text-white"
            onClick={() => {
              window.open(
                product.current_path
                  ? `https://www.evotion-coaching.nl${product.current_path}`
                  : `https://www.evotion-coaching.nl/products/${product?.public_id || product?.id}`,
                "_blank",
              )
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Bekijk Product
          </Button>
          <Button
            className="bg-white text-[#1e1839] hover:bg-[#1e1839] hover:text-white border border-[#1e1839]"
            onClick={() => {
              window.open(paymentLink, "_blank")
            }}
          >
            Betaallink testen
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
