"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, ExternalLink, RefreshCw, Copy, BookOpen } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

  const formatCurrency = (amount: number | string | undefined | null, currency = "EUR") => {
    if (amount === undefined || amount === null) {
      return "Prijs niet beschikbaar"
    }

    // Converteer naar nummer als het een string is
    let numericAmount: number

    if (typeof amount === "string") {
      // Vervang komma's door punten voor consistente parsing
      const normalizedAmount = amount.replace(",", ".")
      numericAmount = Number.parseFloat(normalizedAmount)
    } else {
      numericAmount = amount
    }

    if (isNaN(numericAmount)) {
      return "Ongeldige prijs"
    }

    // ClickFunnels API geeft prijzen als hele getallen (bijv. 257 voor €257)
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount)
  }

  // Generate payment link
  const generatePaymentLink = (product: any) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    return `${baseUrl}/checkout/${product.id}`
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

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
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

  // Debug info
  console.log("Product object:", product)
  console.log("Product has prices:", product.prices?.length || 0)
  console.log("Product has variants:", product.variants?.length || 0)
  console.log("Product has courses:", product.courses?.length || 0)

  const paymentLink = generatePaymentLink(product)
  const isCopied = copiedLink === paymentLink

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Product Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Productgegevens</CardTitle>
              <CardDescription>Basisinformatie over het product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Product ID</h4>
                <p>{product.id}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Publieke ID</h4>
                <p>{product.public_id || "Geen publieke ID"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Beschrijving</h4>
                <p>{product.description || "Geen beschrijving"}</p>
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
              {product.current_path && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">URL</h4>
                  <a
                    href={product.current_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    {product.current_path}
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variants Card */}
          <Card>
            <CardHeader>
              <CardTitle>Varianten</CardTitle>
              <CardDescription>Beschikbare varianten van dit product</CardDescription>
            </CardHeader>
            <CardContent>
              {product.variants && product.variants.length > 0 ? (
                <div className="space-y-4">
                  {product.variants.map((variant: any) => (
                    <Card key={variant.id} className="border border-gray-200">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{variant.name}</CardTitle>
                            <CardDescription>{variant.description || "Geen beschrijving"}</CardDescription>
                          </div>
                          <Badge variant={variant.default ? "default" : "outline"}>
                            {variant.default ? "Standaard" : "Variant"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Variant ID</h4>
                            <p>{variant.id}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">SKU</h4>
                            <p>{variant.sku || "Geen SKU"}</p>
                          </div>
                        </div>

                        {/* Prijzen voor deze variant */}
                        {variant.prices && variant.prices.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Prijzen</h4>
                            <div className="grid grid-cols-1 gap-2">
                              {variant.prices.map((price: any) => (
                                <div
                                  key={price.id}
                                  className="flex justify-between items-center p-2 bg-gray-50 rounded-md"
                                >
                                  <div>
                                    <span className="font-medium">{formatCurrency(price.amount, price.currency)}</span>
                                    {price.recurring && (
                                      <span className="text-sm text-gray-500 ml-2">
                                        / {price.interval_count || 1} {price.interval || "maand"}
                                      </span>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {price.recurring ? "Terugkerend" : "Eenmalig"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Geen varianten gevonden voor dit product.</p>
              )}
            </CardContent>
          </Card>

          {/* Courses Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Gekoppelde cursussen
              </CardTitle>
              <CardDescription>Cursussen die aan dit product zijn gekoppeld via collections</CardDescription>
            </CardHeader>
            <CardContent>
              {product.courses && product.courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.courses.map((course: any, index: number) => (
                    <Card key={index} className="border border-gray-200">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">{course.courseName}</CardTitle>
                        <CardDescription>ID: {course.courseId}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <Badge className="mb-2 bg-purple-50 text-purple-700 border-purple-200">
                          Collection: {course.collectionName}
                        </Badge>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Standaard prijs Card */}
          <Card>
            <CardHeader>
              <CardTitle>Standaard prijs</CardTitle>
              <CardDescription>Huidige prijs voor dit product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {product.defaultPrice ? (
                  <p className="text-3xl font-bold">{formatCurrency(product.defaultPrice.amount)}</p>
                ) : product.prices && product.prices.length > 0 ? (
                  <p className="text-3xl font-bold">{formatCurrency(product.prices[0].amount)}</p>
                ) : (
                  <p className="text-gray-500">Prijs niet beschikbaar</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prijzen Card */}
          <Card>
            <CardHeader>
              <CardTitle>Alle prijzen</CardTitle>
              <CardDescription>Alle prijzen voor dit product</CardDescription>
            </CardHeader>
            <CardContent>
              {product.prices && product.prices.length > 0 ? (
                <div className="space-y-3">
                  {product.prices.map((price: any) => (
                    <div key={price.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{formatCurrency(price.amount, price.currency)}</span>
                        <Badge variant="outline">{price.recurring ? "Terugkerend" : "Eenmalig"}</Badge>
                      </div>
                      {price.recurring && (
                        <p className="text-sm text-gray-500 mt-1">
                          Elke {price.interval_count || 1} {price.interval || "maand"}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">ID: {price.id}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertTitle>Geen prijzen gevonden</AlertTitle>
                  <AlertDescription>Dit product heeft geen prijzen. Voeg prijzen toe in ClickFunnels.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Betaallinks Card */}
          <Card>
            <CardHeader>
              <CardTitle>Betaallinks</CardTitle>
              <CardDescription>Deel deze link om het product te verkopen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <Button
                className="w-full"
                onClick={() => {
                  window.open(paymentLink, "_blank")
                }}
              >
                Betaallink testen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
