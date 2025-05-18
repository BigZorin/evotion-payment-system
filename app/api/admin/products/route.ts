import { NextResponse } from "next/server"
import { getClickFunnelsProducts } from "@/lib/admin"
import { apiCache } from "@/lib/cache"

export async function GET(request: Request) {
  try {
    console.log("API route /api/admin/products called")

    // Check if we need to bypass cache
    const url = new URL(request.url)
    const bypassCache = url.searchParams.get("refresh") === "true"

    if (bypassCache) {
      console.log("Bypassing cache and fetching fresh data")
      // Invalidate products cache
      apiCache.invalidateType("products")
    }

    // Fetch products with variants and prices (using cache)
    console.log("Fetching products from ClickFunnels...")
    const clickfunnelsProducts = await getClickFunnelsProducts(bypassCache)
    console.log(`Successfully fetched ${clickfunnelsProducts.length} products from ClickFunnels`)

    return NextResponse.json({ clickfunnelsProducts })
  } catch (error) {
    console.error("Error in /api/admin/products:", error)
    return NextResponse.json({ error: "Failed to fetch products", message: error.message }, { status: 500 })
  }
}
