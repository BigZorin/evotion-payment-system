"use client"

import { CardFooter } from "@/components/ui/card"
import { CardContent } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Menu, X, Home, ShoppingBag, LinkIcon, Search, RefreshCw, RotateCcw, AlertTriangle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import ProductsTab from "./products"
import ProductDetails from "./product-details"
import BetaallinksTabComponent from "./betaallinks"

interface AdminDashboardClientProps {
  initialStats: any
  initialRecentActivity: any[]
  initialRecentEnrollments: any[]
  initialCourses: any[]
  initialClickfunnelsProducts: any[]
  initialLocalProducts: any[]
}

export default function AdminDashboardClient({
  initialStats,
  initialRecentActivity,
  initialRecentEnrollments,
  initialCourses,
  initialClickfunnelsProducts,
  initialLocalProducts,
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState("products")
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [stats, setStats] = useState(
    initialStats || {
      products: { total: 0, trend: 0, trendLabel: "afgelopen maand" },
      courses: { total: 0, trend: 0, trendLabel: "afgelopen maand" },
      payments: { total: 0, trend: 0, trendLabel: "afgelopen maand" },
      enrollments: { total: 0, trend: 0, trendLabel: "afgelopen maand" },
    },
  )
  const [recentActivity, setRecentActivity] = useState(initialRecentActivity || [])
  const [recentEnrollments, setRecentEnrollments] = useState(initialRecentEnrollments || [])
  const [courses, setCourses] = useState(initialCourses || [])
  const [clickfunnelsProducts, setClickfunnelsProducts] = useState(initialClickfunnelsProducts || [])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCacheClearing, setIsCacheClearing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<{
    clickfunnels: boolean
    stripe: boolean
  }>({
    clickfunnels: true,
    stripe: true,
  })

  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)

    return () => {
      window.removeEventListener("resize", checkIfMobile)
    }
  }, [])

  // Laad data bij eerste render
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch("/api/admin/dashboard?refresh=true")

        if (!response.ok) {
          throw new Error(`Error fetching dashboard data: ${response.status}`)
        }

        const data = await response.json()

        setStats(data.stats || initialStats)
        setRecentActivity(data.recentActivity || initialRecentActivity)
        setRecentEnrollments(data.recentEnrollments || initialRecentEnrollments)
        setCourses(data.courses || initialCourses)

        // Check if we got products from ClickFunnels
        if (data.clickfunnelsProducts && data.clickfunnelsProducts.length > 0) {
          setClickfunnelsProducts(data.clickfunnelsProducts)
          setApiStatus((prev) => ({ ...prev, clickfunnels: true }))
        } else {
          console.warn("No ClickFunnels products received, using local products as fallback")
          setClickfunnelsProducts(data.localProducts || initialLocalProducts)
          setApiStatus((prev) => ({ ...prev, clickfunnels: false }))

          // Show a toast notification
          toast({
            title: "ClickFunnels API niet beschikbaar",
            description: "We gebruiken lokale productgegevens als fallback.",
            variant: "destructive",
            duration: 5000,
          })
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err)
        setError("Er is een fout opgetreden bij het laden van de dashboard gegevens.")

        // Use local products as fallback
        setClickfunnelsProducts(initialLocalProducts || [])
        setApiStatus((prev) => ({ ...prev, clickfunnels: false }))
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, []) // Leeg dependency array zorgt ervoor dat dit alleen bij eerste render gebeurt

  // Functie om dashboard data te verversen
  const refreshDashboard = async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      // Toon toast om aan te geven dat we aan het verversen zijn
      toast({
        title: "Dashboard verversen",
        description: "Bezig met het ophalen van de laatste gegevens...",
        duration: 3000,
      })

      // Voeg refresh=true parameter toe om de cache te omzeilen
      const response = await fetch("/api/admin/dashboard?refresh=true")

      if (!response.ok) {
        throw new Error(`Error refreshing dashboard data: ${response.status}`)
      }

      const data = await response.json()

      setStats(data.stats)
      setRecentActivity(data.recentActivity)
      setRecentEnrollments(data.recentEnrollments)
      setCourses(data.courses)

      // Check if we got products from ClickFunnels
      if (data.clickfunnelsProducts && data.clickfunnelsProducts.length > 0) {
        setClickfunnelsProducts(data.clickfunnelsProducts)
        setApiStatus((prev) => ({ ...prev, clickfunnels: true }))
      } else {
        console.warn("No ClickFunnels products received during refresh, using local products as fallback")
        setClickfunnelsProducts(data.localProducts || initialLocalProducts)
        setApiStatus((prev) => ({ ...prev, clickfunnels: false }))

        // Show a toast notification
        toast({
          title: "ClickFunnels API niet beschikbaar",
          description: "We gebruiken lokale productgegevens als fallback.",
          variant: "destructive",
          duration: 5000,
        })
      }

      // Toon succes toast
      toast({
        title: "Dashboard ververst",
        description: "De gegevens zijn succesvol bijgewerkt.",
        duration: 3000,
      })
    } catch (err) {
      console.error("Error refreshing dashboard data:", err)
      setError("Er is een fout opgetreden bij het verversen van de dashboard gegevens.")

      // Toon fout toast
      toast({
        title: "Fout bij verversen",
        description: "Er is een fout opgetreden bij het verversen van de gegevens.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Functie om de cache te legen
  const clearCache = async () => {
    try {
      setIsCacheClearing(true)
      setError(null)

      // Toon toast om aan te geven dat we de cache aan het legen zijn
      toast({
        title: "Cache legen",
        description: "Bezig met het legen van de cache...",
        duration: 3000,
      })

      // Leeg de volledige cache
      const response = await fetch("/api/admin/cache", {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Error clearing cache: ${response.status}`)
      }

      // Toon succes toast
      toast({
        title: "Cache geleegd",
        description: "De volledige cache is succesvol geleegd.",
        duration: 3000,
      })

      // Ververs de dashboard data om de nieuwe data te tonen
      await refreshDashboard()
    } catch (err) {
      console.error("Error clearing cache:", err)
      setError("Er is een fout opgetreden bij het legen van de cache.")

      // Toon fout toast
      toast({
        title: "Fout bij legen cache",
        description: "Er is een fout opgetreden bij het legen van de cache.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsCacheClearing(false)
    }
  }

  const navItems = [
    { id: "products", label: "Producten", icon: <ShoppingBag className="h-4 w-4 mr-2" /> },
    { id: "betaallinks", label: "Betaallinks", icon: <LinkIcon className="h-4 w-4 mr-2" /> },
  ]

  const handleSelectProduct = (productId: string) => {
    console.log("Selected product:", productId)
    setSelectedProductId(productId)
  }

  const handleBackToProducts = () => {
    setSelectedProductId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Improved Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a href="/" className="flex items-center">
              <Home className="h-5 w-5 text-[#1e1839]" />
              <span className="ml-2 font-semibold text-gray-800">Dashboard</span>
            </a>
            <div className="h-5 w-px bg-gray-300 hidden md:block"></div>
            <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1e1839]/10 text-[#1e1839]">
              Admin
            </span>
          </div>

          {/* API Status Indicator */}
          {!apiStatus.clickfunnels && (
            <div className="hidden md:flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              ClickFunnels API niet beschikbaar
            </div>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  setSelectedProductId(null) // Reset selected product when changing tabs
                }}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === item.id
                    ? "text-[#1e1839] bg-[#1e1839]/10"
                    : "text-gray-600 hover:text-[#1e1839] hover:bg-gray-100"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}

            <Button variant="outline" size="sm" onClick={clearCache} disabled={isCacheClearing} className="ml-2">
              <RotateCcw className={`h-4 w-4 mr-2 ${isCacheClearing ? "animate-spin" : ""}`} />
              {isCacheClearing ? "Cache legen..." : "Cache legen"}
            </Button>

            <Button variant="outline" size="sm" onClick={refreshDashboard} disabled={isRefreshing} className="ml-2">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Verversen..." : "Verversen"}
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* API Status Indicator (Mobile) */}
        {!apiStatus.clickfunnels && (
          <div className="md:hidden flex items-center justify-center text-amber-600 bg-amber-50 px-3 py-1 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            ClickFunnels API niet beschikbaar
          </div>
        )}

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  setSelectedProductId(null) // Reset selected product when changing tabs
                  setIsMobileMenuOpen(false)
                }}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium ${
                  activeTab === item.id
                    ? "text-[#1e1839] bg-[#1e1839]/10"
                    : "text-gray-600 hover:text-[#1e1839] hover:bg-gray-100"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={clearCache}
              disabled={isCacheClearing}
              className="mx-4 mt-2 w-[calc(100%-2rem)]"
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${isCacheClearing ? "animate-spin" : ""}`} />
              {isCacheClearing ? "Cache legen..." : "Cache legen"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={refreshDashboard}
              disabled={isRefreshing}
              className="mx-4 mt-2 w-[calc(100%-2rem)]"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Verversen..." : "Verversen"}
            </Button>
          </div>
        )}
      </header>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4">
          <div className="relative max-w-md mx-auto md:max-w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#1e1839] focus:border-[#1e1839] sm:text-sm"
              placeholder="Zoek producten, betaallinks of statistieken..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="container mx-auto px-4 py-4">
          <Alert variant="destructive">
            <AlertTitle>Fout</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* API Status Warning */}
      {!apiStatus.clickfunnels && (
        <div className="container mx-auto px-4 py-4">
          <Alert variant="warning" className="bg-amber-50 text-amber-800 border-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ClickFunnels API niet beschikbaar</AlertTitle>
            <AlertDescription>
              We kunnen momenteel geen verbinding maken met de ClickFunnels API. We gebruiken lokale productgegevens als
              fallback. Probeer later opnieuw of neem contact op met de beheerder.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="container mx-auto p-4 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1e1839]">Admin Dashboard</h1>
            <p className="text-[#1e1839]/70">Beheer je producten, cursussen en betaallinks</p>
          </div>

          <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="products">Producten</TabsTrigger>
              <TabsTrigger value="betaallinks">Betaallinks</TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/4 mt-2" />
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-1/3" />
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-20" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <TabsContent value="products">
                  {selectedProductId ? (
                    <ProductDetails productId={selectedProductId} onBack={handleBackToProducts} />
                  ) : (
                    <ProductsTab
                      initialProducts={clickfunnelsProducts}
                      onSelectProduct={handleSelectProduct}
                      searchTerm={searchTerm}
                    />
                  )}
                </TabsContent>

                <TabsContent value="betaallinks">
                  <BetaallinksTabComponent initialProducts={clickfunnelsProducts} searchTerm={searchTerm} />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  )
}
