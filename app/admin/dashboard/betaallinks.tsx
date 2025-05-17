"use client"

import { useState, useEffect } from "react"
import { Copy, ExternalLink, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { ClickFunnelsProduct } from "@/lib/admin"

interface BetaallinksTabProps {
  initialProducts: ClickFunnelsProduct[]
  searchTerm?: string
}

export default function BetaallinksTabComponent({ initialProducts, searchTerm = "" }: BetaallinksTabProps) {
  const [products, setProducts] = useState<ClickFunnelsProduct[]>(initialProducts || [])
  const [filteredProducts, setFilteredProducts] = useState<ClickFunnelsProduct[]>(initialProducts || [])
  const [isLoading, setIsLoading] = useState(false)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Update local search term when prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  // Filter products when search term changes
  useEffect(() => {
    if (!products) return

    const filtered = products.filter((product) => {
      const searchLower = localSearchTerm.toLowerCase()
      return (
        product.name?.toLowerCase().includes(searchLower) ||
        product.public_id?.toLowerCase().includes(searchLower) ||
        product.id?.toString().includes(searchLower)
      )
    })

    setFilteredProducts(filtered)
  }, [localSearchTerm, products])

  // Format price for display
  const formatPrice = (price?: number, currency = "EUR") => {
    if (!price) return "Prijs niet beschikbaar"

    // Als de prijs kleiner is dan 10, gaan we ervan uit dat het in euro's is en vermenigvuldigen we met 100
    const priceInCents = price < 10 ? price * 100 : price

    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: currency,
    }).format(priceInCents / 100)
  }

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

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1e1839]">Betaallinks</h2>
          <p className="text-[#1e1839]/70">Genereer en beheer betaallinks voor je producten</p>
        </div>
        <Button className="bg-[#1e1839] hover:bg-[#1e1839]/90">
          <Plus className="mr-2 h-4 w-4" /> Nieuwe betaallink
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts && filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const paymentLink = generatePaymentLink(product)
            const isCopied = copiedLink === paymentLink

            return (
              <Card
                key={product.id}
                className="overflow-hidden border border-gray-200 hover:border-[#1e1839]/30 hover:shadow-md transition-all"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-[#1e1839] line-clamp-1">
                        {product.name}
                      </CardTitle>
                      <CardDescription className="text-xs">ID: {product.id}</CardDescription>
                    </div>
                    {product.visible_in_store && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Actief
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="text-sm text-gray-500 mb-2">
                    <span className="font-medium text-[#1e1839]">Prijs: </span>
                    {product.defaultPrice
                      ? formatPrice(product.defaultPrice.amount)
                      : product.prices && product.prices.length > 0
                        ? formatPrice(product.prices[0].amount)
                        : "Prijs niet beschikbaar"}
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Betaallink:</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={paymentLink}
                        readOnly
                        className="text-xs bg-gray-50"
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
                <CardFooter className="p-4 pt-0 flex justify-end">
                  <Button
                    variant="ghost"
                    className="text-[#1e1839]"
                    onClick={() => {
                      window.open(paymentLink, "_blank")
                    }}
                  >
                    Testen <ExternalLink className="ml-1 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-[#1e1839]/70">Geen producten gevonden</p>
          </div>
        )}
      </div>
    </div>
  )
}
