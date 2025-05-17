"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ExternalLink, Copy, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

interface ProductDetailsProps {
  productId: string
  onBack: () => void
}

interface Variant {
  id: number
  public_id: string
  name: string
  description: string | null
  properties_values?: {
    property_id: number
    value: string
  }[]
  price_ids: string[] | null
}

interface Price {
  id: number
  public_id: string
  variant_id: number
  amount: number
  currency: string
  recurring: boolean
  recurring_interval?: string
  recurring_interval_count?: number
}

interface Product {
  id: number
  public_id: string
  name: string
  description: string
  variants?: Variant[]
  prices?: Price[]
}

export default function ProductDetails({ productId, onBack }: ProductDetailsProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedLinks, setCopiedLinks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log(`Fetching product details for ID: ${productId}`)

        // Gebruik de algemene API route zonder authenticatie
        const response = await fetch(`/api/products/${productId}`)

        if (!response.ok) {
          console.error(`API response error: ${response.status} ${response.statusText}`)
          const errorText = await response.text()
          console.error(`Error response body: ${errorText}`)
          throw new Error(`Failed to fetch product details (Status: ${response.status})`)
        }

        const data = await response.json()
        console.log("Product details received:", data)

        if (!data.product) {
          throw new Error("Product data not found in API response")
        }

        setProduct(data.product)
      } catch (err) {
        console.error("Error fetching product details:", err)
        setError(`Er is een fout opgetreden bij het ophalen van de productgegevens: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (productId) {
      fetchProductDetails()
    }
  }, [productId])

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedLinks({ ...copiedLinks, [key]: true })
      setTimeout(() => {
        setCopiedLinks({ ...copiedLinks, [key]: false })
      }, 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const getCheckoutUrl = (variantId: string) => {
    return `${window.location.origin}/checkout/${variantId}`
  }

  const getVariantPropertyValue = (variant: Variant) => {
    if (!variant.properties_values || variant.properties_values.length === 0) {
      return null
    }
    return variant.properties_values[0]?.value || null
  }

  const formatRecurringInterval = (price: Price) => {
    if (!price.recurring) return "Eenmalig"

    const interval = price.recurring_interval || "month"
    const count = price.recurring_interval_count || 1

    const intervalMap: Record<string, string> = {
      day: count === 1 ? "dag" : "dagen",
      week: count === 1 ? "week" : "weken",
      month: count === 1 ? "maand" : "maanden",
      year: count === 1 ? "jaar" : "jaar",
    }

    return `Elke ${count} ${intervalMap[interval]}`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack} disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug
          </Button>
          <Skeleton className="h-8 w-40" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
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
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fout</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Product niet gevonden</AlertTitle>
          <AlertDescription>Het opgevraagde product kon niet worden gevonden.</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Group prices by variant
  const pricesByVariant: Record<number, Price[]> = {}
  product.prices?.forEach((price) => {
    if (!pricesByVariant[price.variant_id]) {
      pricesByVariant[price.variant_id] = []
    }
    pricesByVariant[price.variant_id].push(price)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
        <Badge variant="outline" className="text-xs">
          ID: {product.public_id}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">{product.name}</CardTitle>
          <CardDescription>{product.description || "Geen beschrijving beschikbaar"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Variants Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Varianten</h3>
            {product.variants && product.variants.length > 0 ? (
              <div className="space-y-4">
                {product.variants.map((variant) => {
                  const propertyValue = getVariantPropertyValue(variant)
                  const variantPrices = pricesByVariant[variant.id] || []

                  return (
                    <Card key={variant.public_id} className="border border-gray-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-md font-semibold">
                            {variant.name}
                            {propertyValue && (
                              <Badge variant="outline" className="ml-2">
                                {propertyValue}
                              </Badge>
                            )}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            ID: {variant.public_id}
                          </Badge>
                        </div>
                        {variant.description && (
                          <CardDescription className="text-sm">{variant.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pb-2">
                        <h4 className="text-sm font-medium mb-2">Prijzen</h4>
                        {variantPrices.length > 0 ? (
                          <div className="space-y-2">
                            {variantPrices.map((price) => (
                              <div
                                key={price.public_id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                              >
                                <div>
                                  <span className="font-medium">
                                    {formatCurrency(price.amount / 100, price.currency)}
                                  </span>
                                  <span className="text-sm text-gray-500 ml-2">{formatRecurringInterval(price)}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  ID: {price.public_id}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Geen prijzen beschikbaar</p>
                        )}
                      </CardContent>
                      <CardFooter className="pt-2">
                        <div className="flex flex-wrap gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() =>
                              copyToClipboard(getCheckoutUrl(variant.public_id), `checkout-${variant.public_id}`)
                            }
                          >
                            {copiedLinks[`checkout-${variant.public_id}`] ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Gekopieerd
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Kopieer checkout link
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => window.open(getCheckoutUrl(variant.public_id), "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Bekijk checkout
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500">Geen varianten beschikbaar</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
