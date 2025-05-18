import { NextResponse } from "next/server"
import { getProductWithVariantsAndPrices } from "@/lib/clickfunnels"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Fetch product with variants and prices
    const product = await getProductWithVariantsAndPrices(id)

    return NextResponse.json({ product })
  } catch (error) {
    console.error(`Error in /api/admin/products/${params.id}:`, error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
