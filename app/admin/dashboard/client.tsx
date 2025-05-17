"use client"

import { useState, useEffect } from "react"
import { Menu, X, Home, ShoppingBag, LinkIcon, Search } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

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

  // Functie om dashboard data te verversen
  const refreshDashboard = async () => {
    setIsRefreshing(true)
    // Hier zou je API calls kunnen doen om verse data op te halen
    // Voor nu simuleren we een vertraging
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
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
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

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

            <TabsContent value="products">
              {selectedProductId ? (
                <ProductDetails productId={selectedProductId} onBack={handleBackToProducts} />
              ) : (
                <ProductsTab
                  initialProducts={initialClickfunnelsProducts}
                  onSelectProduct={handleSelectProduct}
                  searchTerm={searchTerm}
                />
              )}
            </TabsContent>

            <TabsContent value="betaallinks">
              <BetaallinksTabComponent initialProducts={initialClickfunnelsProducts} searchTerm={searchTerm} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
