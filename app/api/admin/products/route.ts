import { NextResponse } from "next/server"
import { getClickFunnelsProducts } from "@/lib/admin"

export async function GET(request: Request) {
  try {
    console.log("API route /api/admin/products called")

    // Fetch products with variants and prices
    console.log("Fetching products from ClickFunnels...")
    const clickfunnelsProducts = await getClickFunnelsProducts()
    console.log(`Successfully fetched ${clickfunnelsProducts.length} products from ClickFunnels`)

    return NextResponse.json({ clickfunnelsProducts })
  } catch (error) {
    console.error("Error in /api/admin/products:", error)
    return NextResponse.json({ error: "Failed to fetch products", message: error.message }, { status: 500 })
  }
}
