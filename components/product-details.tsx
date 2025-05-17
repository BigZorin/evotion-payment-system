"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ExternalLink, CreditCard, RefreshCw } from "lucide-react"
import Link from "next/link"
import { CopyButton } from "@/components/copy-button"

interface ProductDetailsProps {
  productId: string
  includeVariants?: boolean
  includePrices?: boolean
}

export function ProductDetails({ productId, includeVariants = false, includePrices = false }: ProductDetailsProps) {
  const [product, setProduct] = useState<any>(null)
  const [variants, setVariants] = useState<any[]>([])
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<"clickfunnels" | "local" | null>(null)
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
      setProduct(data.product)
      setSource(data.source)

      if (data.variants) {
        setVariants(data.variants)
      }

      if (data.prices) {
        setPrices(data.prices)
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

  // Functie om prijsinformatie te formatteren
  const formatPrice = (price: any) => {
    if (!price) return "Geen prijs"

    const amount = price.amount || 0
    const currency = price.currency || "EUR"

    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
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

  return (
    <Card className="border-[#1e1839]/10 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="border-b border-[#1e1839]/10 bg-[#1e1839]/5 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-[#1e1839] flex items-center gap-2">
              {product.name}
              {source && (
                <Badge className={source === "clickfunnels" ? "bg-blue-500" : "bg-green-500"}>
                  {source === "clickfunnels" ? "ClickFunnels" : "Lokaal"}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-[#1e1839]/60">
              ID: {product.public_id || product.id.toString()}
            </CardDescription>
          </div>
          {product.defaultPrice && (
            <Badge className="bg-[#1e1839] text-white hover:bg-[#1e1839]/90">{formatPrice(product.defaultPrice)}</Badge>
          )}
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
      <CardContent className="pt-4">
        <p className="text-[#1e1839]/80 mb-4">{product.seo_description || "Geen beschrijving beschikbaar"}</p>

        <div className="space-y-3">
          {/* Product URL */}
          <div className="bg-[#1e1839]/5 p-3 rounded-md">
            <p className="text-sm font-medium text-[#1e1839] mb-1">Product URL:</p>
            <div className="flex items-center gap-2">
              <code className="bg-white border border-[#1e1839]/20 text-[#1e1839] p-1.5 rounded text-xs flex-1 overflow-x-auto">
                {getProductUrl()}
              </code>
              <CopyButton
                text={getProductUrl()}
                size="icon"
                className="h-7 w-7 border-[#1e1839]/30 text-[#1e1839] hover:bg-[#1e1839] hover:text-white"
              />
            </div>
          </div>

          {/* Payment Link */}
          <div className="bg-[#1e1839]/5 p-3 rounded-md">
            <p className="text-sm font-medium text-[#1e1839] mb-1">Betaallink:</p>
            <div className="flex items-center gap-2">
              <code className="bg-white border border-[#1e1839]/20 text-[#1e1839] p-1.5 rounded text-xs flex-1 overflow-x-auto">
                {getPaymentLink()}
              </code>
              <CopyButton
                text={getPaymentLink()}
                size="icon"
                className="h-7 w-7 border-[#1e1839]/30 text-[#1e1839] hover:bg-[#1e1839] hover:text-white"
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="bg-[#1e1839]/5 p-3 rounded-md">
            <p className="text-sm font-medium text-[#1e1839] mb-1">Product Details:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">Aangemaakt:</span>{" "}
                {product.created_at ? new Date(product.created_at).toLocaleString("nl-NL") : "Onbekend"}
              </div>
              <div>
                <span className="font-medium">Bijgewerkt:</span>{" "}
                {product.updated_at ? new Date(product.updated_at).toLocaleString("nl-NL") : "Onbekend"}
              </div>
              <div>
                <span className="font-medium">Gearchiveerd:</span> {product.archived === true ? "Ja" : "Nee"}
              </div>
              <div>
                <span className="font-medium">Zichtbaar in winkel:</span>{" "}
                {product.visible_in_store === true ? "Ja" : "Nee"}
              </div>
            </div>
          </div>

          {/* Variants */}
          {includeVariants && variants.length > 0 && (
            <div className="bg-[#1e1839]/5 p-3 rounded-md">
              <p className="text-sm font-medium text-[#1e1839] mb-1">Varianten ({variants.length}):</p>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1e1839]/10">
                      <th className="text-left p-1">ID</th>
                      <th className="text-left p-1">Naam</th>
                      <th className="text-left p-1">Beschrijving</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant) => (
                      <tr key={variant.id} className="border-b border-[#1e1839]/10">
                        <td className="p-1">{variant.id}</td>
                        <td className="p-1">{variant.name}</td>
                        <td className="p-1">{variant.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Prices */}
          {includePrices && prices.length > 0 && (
            <div className="bg-[#1e1839]/5 p-3 rounded-md">
              <p className="text-sm font-medium text-[#1e1839] mb-1">Prijzen ({prices.length}):</p>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1e1839]/10">
                      <th className="text-left p-1">ID</th>
                      <th className="text-left p-1">Type</th>
                      <th className="text-left p-1">Bedrag</th>
                      <th className="text-left p-1">Interval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((price) => (
                      <tr key={price.id} className="border-b border-[#1e1839]/10">
                        <td className="p-1">{price.id}</td>
                        <td className="p-1">{price.price_type || "—"}</td>
                        <td className="p-1">{formatPrice(price)}</td>
                        <td className="p-1">
                          {price.recurring_interval
                            ? `${price.recurring_interval_count || 1}x per ${price.recurring_interval}`
                            : "Eenmalig"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
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
        <Link href={getPaymentLink()} target="_blank">
          <Button
            size="sm"
            className="bg-white text-[#1e1839] hover:bg-[#1e1839] hover:text-white border border-[#1e1839]"
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Test Betaallink
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
