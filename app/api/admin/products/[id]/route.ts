import { NextResponse } from "next/server"
import { getProductWithVariantsAndPrices } from "@/lib/clickfunnels"
import { ADMIN_API_KEY } from "@/lib/config"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check for API key in headers
    const authHeader = request.headers.get("authorization")
    const apiKey = authHeader?.split(" ")[1]

    if (apiKey !== ADMIN_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    // Fetch product with variants and prices
    const product = await getProductWithVariantsAndPrices(id)

    return NextResponse.json({ product })
  } catch (error) {
    console.error(`Error in /api/admin/products/${params.id}:`, error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
