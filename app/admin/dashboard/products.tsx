"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ExternalLink, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ClickFunnelsProduct } from "@/lib/admin"

interface ProductsTabProps {
  initialProducts: ClickFunnelsProduct[]
  onSelectProduct: (productId: string) => void
  searchTerm?: string
}

// Vervang de huidige formatPrice functie met deze verbeterde versie
const formatPrice = (price: any) => {
  if (!price) return "Prijs niet beschikbaar"

  const amount = price.amount

  // ClickFunnels API geeft prijzen als decimale getallen (bijv. "257.00" voor €257)
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: price.currency || "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function ProductsTab({ initialProducts, onSelectProduct, searchTerm = "" }: ProductsTabProps) {
  const [products, setProducts] = useState<ClickFunnelsProduct[]>(initialProducts || [])
  const [filteredProducts, setFilteredProducts] = useState<ClickFunnelsProduct[]>(initialProducts || [])
  const [activeProducts, setActiveProducts] = useState<ClickFunnelsProduct[]>([])
  const [archivedProducts, setArchivedProducts] = useState<ClickFunnelsProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [activeTab, setActiveTab] = useState("all")

  // Update local search term when prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  // Filter products when search term changes or products change
  useEffect(() => {
    if (!products) return

    // Filter based on search term
    const filtered = products.filter((product) => {
      const searchLower = localSearchTerm.toLowerCase()
      return (
        product.name?.toLowerCase().includes(searchLower) ||
        product.public_id?.toLowerCase().includes(searchLower) ||
        product.id?.toString().includes(searchLower)
      )
    })

    // Separate active and archived products
    const active = filtered.filter((product) => product.visible_in_store && !product.archived)
    const archived = filtered.filter((product) => !product.visible_in_store || product.archived)

    setFilteredProducts(filtered)
    setActiveProducts(active)
    setArchivedProducts(archived)
  }, [localSearchTerm, products])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Render product card
  const renderProductCard = (product: ClickFunnelsProduct) => (
    <Card
      key={product.id}
      className="overflow-hidden border border-gray-200 hover:border-[#1e1839]/30 hover:shadow-md transition-all"
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold text-[#1e1839] line-clamp-1">{product.name}</CardTitle>
            <CardDescription className="text-xs">ID: {product.id}</CardDescription>
          </div>
          {product.visible_in_store && !product.archived && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Actief
            </Badge>
          )}
          {product.archived && (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
              Gearchiveerd
            </Badge>
          )}
          {!product.visible_in_store && !product.archived && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Niet actief
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="text-sm text-gray-500 mb-2">
          <span className="font-medium text-[#1e1839]">Prijs: </span>
          {product.defaultPrice ? (
            <p className="text-lg font-semibold">{formatPrice(product.defaultPrice)}</p>
          ) : product.prices && product.prices.length > 0 ? (
            <p className="text-lg font-semibold">{formatPrice(product.prices[0])}</p>
          ) : (
            <p className="text-sm text-gray-500">Prijs niet beschikbaar</p>
          )}
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-medium text-[#1e1839]">Variant: </span>
          {product.variant ? product.variant.name : "Standaard"}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button
          variant="outline"
          className="text-[#1e1839] border-[#1e1839] hover:bg-[#1e1839] hover:text-white"
          onClick={() => onSelectProduct(product.id.toString())}
        >
          Details <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="text-[#1e1839]"
          onClick={() => {
            window.open(`/checkout/${product.id}`, "_blank")
          }}
        >
          Bekijk <ExternalLink className="ml-1 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1e1839]">Producten</h2>
          <p className="text-[#1e1839]/70">Beheer je producten en maak betaallinks aan</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-[#1e1839]/70" />
          <span className="text-sm text-[#1e1839]/70">
            {activeProducts.length} actief / {archivedProducts.length} gearchiveerd
          </span>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="all">
            Alle producten{" "}
            <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{filteredProducts.length}</span>
          </TabsTrigger>
          <TabsTrigger value="active">
            Actief <span className="ml-2 text-xs bg-green-100 px-2 py-0.5 rounded-full">{activeProducts.length}</span>
          </TabsTrigger>
          <TabsTrigger value="archived">
            Gearchiveerd{" "}
            <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{archivedProducts.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts && filteredProducts.length > 0 ? (
              filteredProducts.map(renderProductCard)
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-[#1e1839]/70">Geen producten gevonden</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProducts && activeProducts.length > 0 ? (
              activeProducts.map(renderProductCard)
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-[#1e1839]/70">Geen actieve producten gevonden</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="archived">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archivedProducts && archivedProducts.length > 0 ? (
              archivedProducts.map(renderProductCard)
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-[#1e1839]/70">Geen gearchiveerde producten gevonden</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
