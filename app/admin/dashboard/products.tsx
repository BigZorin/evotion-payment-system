"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, RefreshCw, Eye } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Product {
  id: string | number
  public_id?: string
  name: string
  description?: string
  prices?: any[]
  defaultPrice?: any
  variants?: any[]
  archived?: boolean
  visible_in_store?: boolean
  status?: string
}

interface ProductsTabProps {
  initialProducts: Product[]
  onSelectProduct: (productId: string) => void
  searchTerm?: string
}

export default function ProductsTab({ initialProducts = [], onSelectProduct, searchTerm = "" }: ProductsTabProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [loading, setLoading] = useState(!initialProducts.length)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!initialProducts.length) {
      fetchProducts()
    }
  }, [initialProducts])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/products")
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`)
      }
      const data = await response.json()

      // Verwerk de data uit de API response
      let productsArray: Product[] = []

      if (Array.isArray(data)) {
        productsArray = data
      } else if (data && typeof data === "object") {
        // Probeer verschillende mogelijke array properties
        if (Array.isArray(data.clickfunnelsProducts)) {
          productsArray = data.clickfunnelsProducts
        } else if (Array.isArray(data.products)) {
          productsArray = data.products
        } else if (Array.isArray(data.localProducts)) {
          productsArray = data.localProducts
        }
      }

      setProducts(productsArray)
    } catch (err) {
      console.error("Error fetching products:", err)
      setError(
        `Er is een fout opgetreden bij het ophalen van de producten: ${err instanceof Error ? err.message : "Onbekende fout"}`,
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch("/api/products?refresh=true")
      if (!response.ok) {
        throw new Error(`Failed to refresh products: ${response.status}`)
      }
      const data = await response.json()

      // Verwerk de data uit de API response
      let productsArray: Product[] = []

      if (Array.isArray(data)) {
        productsArray = data
      } else if (data && typeof data === "object") {
        // Probeer verschillende mogelijke array properties
        if (Array.isArray(data.clickfunnelsProducts)) {
          productsArray = data.clickfunnelsProducts
        } else if (Array.isArray(data.products)) {
          productsArray = data.products
        } else if (Array.isArray(data.localProducts)) {
          productsArray = data.localProducts
        }
      }

      setProducts(productsArray)
    } catch (err) {
      console.error("Error refreshing products:", err)
      setError(
        `Er is een fout opgetreden bij het vernieuwen van de producten: ${err instanceof Error ? err.message : "Onbekende fout"}`,
      )
    } finally {
      setRefreshing(false)
    }
  }

  // Filter producten op basis van zoekterm
  const filteredProducts = products.filter((product) => {
    if (!searchTerm) return true

    const term = searchTerm.toLowerCase()
    return (
      product?.name?.toLowerCase().includes(term) ||
      (product?.public_id && product.public_id.toLowerCase().includes(term)) ||
      (product?.description && product.description.toLowerCase().includes(term)) ||
      String(product?.id).includes(term)
    )
  })

  if (loading && !refreshing) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border border-gray-200">
            <CardHeader className="bg-gray-100 animate-pulse h-24"></CardHeader>
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-6 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Geen producten gevonden</h3>
        <p className="text-gray-500 mb-6">
          {searchTerm ? "Probeer een andere zoekopdracht." : "Er zijn nog geen producten beschikbaar."}
        </p>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Vernieuwen..." : "Vernieuwen"}
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Producten ({filteredProducts.length})</h2>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Vernieuwen..." : "Vernieuwen"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          // Bepaal de prijs om weer te geven
          let priceDisplay = "Prijs niet beschikbaar"
          let priceCount = 0

          if (product.defaultPrice) {
            priceDisplay = formatCurrency(product.defaultPrice.amount)
            priceCount = product.prices?.length || 0
          } else if (product.prices && product.prices.length > 0) {
            priceDisplay = formatCurrency(product.prices[0].amount)
            priceCount = product.prices.length
          } else if (product.variants && product.variants.length > 0) {
            const variant = product.variants[0]
            if (variant.prices && variant.prices.length > 0) {
              priceDisplay = formatCurrency(variant.prices[0].amount)
              priceCount = variant.prices.length
            }
          }

          return (
            <Card key={product.id} className="border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <Badge variant={product.archived ? "destructive" : "success"}>
                    {product.archived ? "Gearchiveerd" : "Actief"}
                  </Badge>
                </div>
                <CardDescription className="truncate">ID: {product.public_id || product.id}</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Prijs:</p>
                  <p className="text-lg font-semibold">{priceDisplay}</p>
                  {priceCount > 1 && <p className="text-xs text-gray-500">+{priceCount - 1} meer prijsopties</p>}
                </div>
                <Button
                  className="w-full bg-[#1e1839] hover:bg-[#1e1839]/80"
                  onClick={() => onSelectProduct(product.public_id || String(product.id))}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Details bekijken
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
