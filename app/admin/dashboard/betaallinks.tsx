"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "@/components/copy-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { LinkIcon, ExternalLink, Copy, Search, Calendar, ArrowUpDown, AlertCircle, Eye, RefreshCw } from "lucide-react"

// Type definities voor ClickFunnels producten
interface ClickFunnelsPrice {
  id: number
  public_id?: string
  amount: number
  currency: string
  recurring: boolean
  recurring_interval?: string
  recurring_interval_count?: number
}

interface ClickFunnelsVariant {
  id: number
  public_id?: string
  name: string
  description: string | null
  sku?: string
  price_ids?: string[] | number[]
  prices?: ClickFunnelsPrice[]
}

interface ClickFunnelsProduct {
  id: number
  public_id: string
  name: string
  description?: string
  archived?: boolean
  visible_in_store?: boolean
  created_at?: string
  updated_at?: string
  variant_ids?: string[] | number[]
  variants?: ClickFunnelsVariant[]
  prices?: ClickFunnelsPrice[]
  defaultPrice?: ClickFunnelsPrice
  default_variant_id?: number
  status?: string
}

interface BetaallinksTabComponentProps {
  initialProducts?: ClickFunnelsProduct[]
  searchTerm?: string
}

export function BetaallinksTabComponent({ initialProducts = [], searchTerm = "" }: BetaallinksTabComponentProps) {
  const [products, setProducts] = useState<ClickFunnelsProduct[]>(initialProducts)
  const [loading, setLoading] = useState(!initialProducts.length)
  const [error, setError] = useState<string | null>(null)
  const [internalSearchTerm, setInternalSearchTerm] = useState(searchTerm)
  const [sortBy, setSortBy] = useState<"name" | "date">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState<"all" | "active" | "archived">("all")
  const [refreshing, setRefreshing] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ClickFunnelsProduct | null>(null)

  // Update interne zoekterm wanneer externe zoekterm verandert
  useEffect(() => {
    setInternalSearchTerm(searchTerm)
  }, [searchTerm])

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://betalen.evotion-coaching.nl"

  const fetchProducts = async (forceRefresh = false) => {
    try {
      if (!initialProducts.length || forceRefresh) {
        setLoading(true)
        setError(null)

        if (forceRefresh) {
          setRefreshing(true)
        }

        const url = forceRefresh ? "/api/products?refresh=true" : "/api/products"

        console.log(`Fetching products from ${url}`)
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`)
        }

        const data = await response.json()
        console.log("API response:", data)

        // Verwerk de data uit de API response
        let productsArray: ClickFunnelsProduct[] = []

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

        console.log(`Processed ${productsArray.length} products`)
        setProducts(productsArray)
      }
    } catch (err) {
      console.error("Error fetching products:", err)
      setError(
        `Er is een fout opgetreden bij het ophalen van de producten: ${err instanceof Error ? err.message : "Onbekende fout"}`,
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [initialProducts])

  // Filter producten op basis van de actieve tab
  const filterByTab = (product: ClickFunnelsProduct) => {
    switch (activeTab) {
      case "active":
        return product.archived !== true && product.visible_in_store !== false
      case "archived":
        return product.archived === true || product.visible_in_store === false
      default:
        return true
    }
  }

  // Filter producten op basis van zoekterm
  const filterBySearch = (product: ClickFunnelsProduct) => {
    if (!internalSearchTerm) return true

    const term = internalSearchTerm.toLowerCase()
    return (
      product?.name?.toLowerCase().includes(term) ||
      product?.public_id?.toLowerCase().includes(term) ||
      product?.description?.toLowerCase().includes(term) ||
      String(product?.id).includes(term)
    )
  }

  // Sorteer producten
  const sortProducts = (a: ClickFunnelsProduct, b: ClickFunnelsProduct) => {
    if (sortBy === "name") {
      return sortOrder === "asc"
        ? (a?.name || "").localeCompare(b?.name || "")
        : (b?.name || "").localeCompare(a?.name || "")
    } else {
      // Sorteer op datum
      const dateA = a?.created_at ? new Date(a.created_at) : new Date(0)
      const dateB = b?.created_at ? new Date(b.created_at) : new Date(0)
      return sortOrder === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
    }
  }

  // Zorg ervoor dat products altijd een array is
  const safeProducts = Array.isArray(products) ? products : []

  // Filter en sorteer producten
  const filteredProducts = safeProducts.filter(filterByTab).filter(filterBySearch).sort(sortProducts)

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  const handleRefresh = () => {
    fetchProducts(true)
  }

  const handleViewProduct = (product: ClickFunnelsProduct) => {
    setSelectedProduct(product)
  }

  const handleCloseProductDetails = () => {
    setSelectedProduct(null)
  }

  // Genereer betaallink voor een product
  const generatePaymentLink = (product: ClickFunnelsProduct) => {
    // Gebruik public_id als die beschikbaar is, anders gebruik id
    const productId = product.public_id || product.id

    // Voor online coaching producten, gebruik een slug-vriendelijke naam
    if (product.name.toLowerCase().includes("online coaching")) {
      const slug = product.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
      return `${baseUrl}/checkout/${slug}`
    }

    return `${baseUrl}/checkout/${productId}`
  }

  // Bepaal of een product een abonnement is
  const isSubscription = (product: ClickFunnelsProduct): boolean => {
    // Controleer of het product terugkerende prijzen heeft
    if (product.prices && product.prices.length > 0) {
      return product.prices.some((price) => price.recurring === true)
    }

    // Controleer of varianten terugkerende prijzen hebben
    if (product.variants && product.variants.length > 0) {
      return product.variants.some(
        (variant) => variant.prices && variant.prices.some((price) => price.recurring === true),
      )
    }

    return false
  }

  // Render loading state
  if (loading && !refreshing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Betaallinks</h2>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="h-8 bg-gray-200 rounded w-full mb-6 animate-pulse"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded w-full animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Render product details view
  if (selectedProduct) {
    const paymentLink = generatePaymentLink(selectedProduct)

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-800">Product Details</h2>
          <Button variant="outline" onClick={handleCloseProductDetails}>
            Terug naar overzicht
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{selectedProduct.name}</CardTitle>
                <CardDescription>Product ID: {selectedProduct.public_id || selectedProduct.id}</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={selectedProduct.archived ? "destructive" : "success"}>
                  {selectedProduct.archived ? "Gearchiveerd" : "Actief"}
                </Badge>
                {isSubscription(selectedProduct) && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Abonnement
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product beschrijving */}
            {selectedProduct.description && (
              <div>
                <h3 className="text-lg font-medium mb-2">Beschrijving</h3>
                <p className="text-gray-600">{selectedProduct.description}</p>
              </div>
            )}

            {/* Betaallink */}
            <div>
              <h3 className="text-lg font-medium mb-2">Betaallink</h3>
              <div className="flex items-center p-3 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-gray-800 mr-2 flex-1 font-mono text-sm">{paymentLink}</span>
                <CopyButton text={paymentLink} className="text-gray-500 hover:text-gray-700">
                  <Copy className="h-5 w-5" />
                </CopyButton>
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-indigo-600 hover:text-indigo-800"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Varianten */}
            {selectedProduct.variants && selectedProduct.variants.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Varianten</h3>
                <div className="space-y-3">
                  {selectedProduct.variants.map((variant) => (
                    <div key={variant.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{variant.name}</h4>
                        {variant.sku && <span className="text-sm text-gray-500">SKU: {variant.sku}</span>}
                      </div>
                      {variant.description && <p className="text-sm text-gray-600 mt-1">{variant.description}</p>}

                      {/* Prijzen voor deze variant */}
                      {variant.prices && variant.prices.length > 0 && (
                        <div className="mt-2">
                          <h5 className="text-sm font-medium text-gray-700">Prijzen:</h5>
                          <ul className="mt-1 space-y-1">
                            {variant.prices.map((price) => (
                              <li key={price.id} className="text-sm">
                                {/* Toon de prijs zonder te delen door 100 */}
                                {formatCurrency(price.amount, price.currency)}
                                {price.recurring && (
                                  <span className="text-gray-500">
                                    {" "}
                                    / {price.recurring_interval || "maand"}
                                    {price.recurring_interval_count && price.recurring_interval_count > 1
                                      ? ` (elke ${price.recurring_interval_count} ${price.recurring_interval || "maanden"})`
                                      : ""}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prijzen direct gekoppeld aan product */}
            {selectedProduct.prices && selectedProduct.prices.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Prijzen</h3>
                <ul className="space-y-2">
                  {selectedProduct.prices.map((price) => (
                    <li key={price.id} className="flex justify-between p-2 bg-gray-50 rounded border border-gray-200">
                      <span>
                        {/* Toon de prijs zonder te delen door 100 */}
                        {formatCurrency(price.amount, price.currency)}
                        {price.recurring && (
                          <span className="text-gray-500">
                            {" "}
                            / {price.recurring_interval || "maand"}
                            {price.recurring_interval_count && price.recurring_interval_count > 1
                              ? ` (elke ${price.recurring_interval_count} ${price.recurring_interval || "maanden"})`
                              : ""}
                          </span>
                        )}
                      </span>
                      <span className="text-gray-500">ID: {price.public_id || price.id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Aangemaakt op:</span>{" "}
                {selectedProduct.created_at ? new Date(selectedProduct.created_at).toLocaleString("nl-NL") : "Onbekend"}
              </div>
              <div>
                <span className="text-gray-500">Laatst bijgewerkt:</span>{" "}
                {selectedProduct.updated_at ? new Date(selectedProduct.updated_at).toLocaleString("nl-NL") : "Onbekend"}
              </div>
              <div>
                <span className="text-gray-500">Zichtbaar in winkel:</span>{" "}
                {selectedProduct.visible_in_store === false ? "Nee" : "Ja"}
              </div>
              <div>
                <span className="text-gray-500">Product ID:</span> {selectedProduct.id}
              </div>
              <div>
                <span className="text-gray-500">Type:</span>{" "}
                {isSubscription(selectedProduct) ? "Abonnement" : "Eenmalige betaling"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800">Betaallinks</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Vernieuwen..." : "Vernieuwen"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Zoek op naam of ID..."
                value={internalSearchTerm}
                onChange={(e) => setInternalSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy("name")}
                className={`inline-flex items-center px-3 py-2 border ${
                  sortBy === "name"
                    ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                    : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                } rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                Naam
                {sortBy === "name" && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </button>
              <button
                onClick={() => setSortBy("date")}
                className={`inline-flex items-center px-3 py-2 border ${
                  sortBy === "date"
                    ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                    : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                } rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Datum
                {sortBy === "date" && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </button>
              <button
                onClick={toggleSortOrder}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {sortOrder === "asc" ? "Oplopend" : "Aflopend"}
              </button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setActiveTab(value as any)}>
          <div className="px-4 py-2 border-b border-gray-200">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Alle producten</TabsTrigger>
              <TabsTrigger value="active">Actieve producten</TabsTrigger>
              <TabsTrigger value="archived">Gearchiveerde producten</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="p-0">
            {renderProductsTable(filteredProducts)}
          </TabsContent>

          <TabsContent value="active" className="p-0">
            {renderProductsTable(filteredProducts)}
          </TabsContent>

          <TabsContent value="archived" className="p-0">
            {renderProductsTable(filteredProducts)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )

  // Helper functie om de producttabel te renderen
  function renderProductsTable(products: ClickFunnelsProduct[]) {
    if (products.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <LinkIcon className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen producten gevonden</h3>
          <p className="mt-1 text-sm text-gray-500">
            {internalSearchTerm
              ? "Probeer een andere zoekopdracht."
              : "Er zijn geen producten beschikbaar in deze categorie."}
          </p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Product
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Prijs
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Betaallink
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              // Bepaal de prijs om weer te geven
              let priceDisplay = "Prijs niet beschikbaar"
              let priceCount = 0
              let isRecurring = false

              if (product.defaultPrice) {
                // Toon de prijs zonder te delen door 100
                priceDisplay = formatCurrency(product.defaultPrice.amount, product.defaultPrice.currency)
                priceCount = product.prices?.length || 0
                isRecurring = product.defaultPrice.recurring || false
              } else if (product.prices && product.prices.length > 0) {
                // Toon de prijs zonder te delen door 100
                priceDisplay = formatCurrency(product.prices[0].amount, product.prices[0].currency)
                priceCount = product.prices.length
                isRecurring = product.prices[0].recurring || false
              } else if (product.variants && product.variants.length > 0) {
                const variant = product.variants[0]
                if (variant.prices && variant.prices.length > 0) {
                  // Toon de prijs zonder te delen door 100
                  priceDisplay = formatCurrency(variant.prices[0].amount, variant.prices[0].currency)
                  priceCount = variant.prices.length
                  isRecurring = variant.prices[0].recurring || false
                }
              }

              // Genereer de betaallink
              const paymentLink = generatePaymentLink(product)

              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <LinkIcon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">{product.name}</span>
                          {isSubscription(product) && (
                            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              Abonnement
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          ID: {product.public_id || product.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={product.archived ? "destructive" : "success"}>
                      {product.archived ? "Gearchiveerd" : "Actief"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {priceDisplay}
                      {isRecurring && <span className="text-gray-500 ml-1">/ maand</span>}
                    </div>
                    {priceCount > 1 && <div className="text-sm text-gray-500">+{priceCount - 1} meer</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="truncate max-w-xs">{paymentLink}</span>
                      <CopyButton text={paymentLink} className="ml-2 text-gray-400 hover:text-gray-600">
                        <Copy className="h-4 w-4" />
                      </CopyButton>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => handleViewProduct(product)}
                        className="text-gray-600 hover:text-gray-900 flex items-center"
                        title="Details bekijken"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        <span>Details</span>
                      </button>
                      <a
                        href={paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        title="Betaalpagina bekijken"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        <span>Bekijken</span>
                      </a>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }
}

export default BetaallinksTabComponent
