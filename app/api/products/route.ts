import { type NextRequest, NextResponse } from "next/server"
import { getClickFunnelsProducts } from "@/lib/admin"
import { products as localProducts } from "@/lib/products"

// Cache voor producten om herhaalde API-aanroepen te voorkomen
let productsCache: any[] = []
let productsCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minuten cache

export async function GET(req: NextRequest) {
  try {
    console.log("API route /api/products called")

    const searchParams = req.nextUrl.searchParams
    const includeArchived = searchParams.get("includeArchived") === "true"
    const forceRefresh = searchParams.get("refresh") === "true"

    // Check cache first
    const now = Date.now()
    if (!forceRefresh && productsCache.length > 0 && now - productsCacheTime < CACHE_TTL) {
      console.log("Cache hit: Using cached products list")
    } else {
      console.log("Cache miss or refresh requested: Fetching products from ClickFunnels API")
      try {
        productsCache = await getClickFunnelsProducts()
        productsCacheTime = now
        console.log(`Successfully fetched ${productsCache.length} products from ClickFunnels API`)
      } catch (error) {
        console.error("Error fetching ClickFunnels products:", error)
        // Als er een fout optreedt bij het ophalen van ClickFunnels producten,
        // gebruik dan een lege array om te voorkomen dat de hele request faalt
        productsCache = []
      }
    }

    // Filter producten
    const filteredProducts = includeArchived
      ? productsCache
      : productsCache.filter((product) => product.archived !== true)

    // Voeg lokale producten toe aan de response
    return NextResponse.json({
      clickfunnelsProducts: filteredProducts,
      localProducts,
      total: filteredProducts.length + localProducts.length,
    })
  } catch (error: any) {
    console.error("Error in /api/products:", error)

    // Return een leeg resultaat in plaats van een foutmelding
    return NextResponse.json({
      clickfunnelsProducts: [],
      localProducts: [],
      total: 0,
      error: error.message || "Er is een fout opgetreden",
    })
  }
}
