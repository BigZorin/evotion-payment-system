import { NextResponse } from "next/server"
import { getClickFunnelsProduct, getProductVariants, getVariantPrices } from "@/lib/admin"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log(`API route /api/products/${params.id} called`)

    const { id } = params

    // Haal het product op
    const product = await getClickFunnelsProduct(id)

    if (!product) {
      console.log(`Product with ID ${id} not found`)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    console.log(`Product found: ${product.name} (ID: ${product.id})`)

    // Haal varianten op
    try {
      const variants = await getProductVariants(id)
      product.variants = variants || []
      console.log(`Retrieved ${variants?.length || 0} variants for product ${id}`)

      // Haal prijzen op voor elke variant
      if (variants && variants.length > 0) {
        const prices = []

        for (const variant of variants) {
          if (variant.price_ids && variant.price_ids.length > 0) {
            try {
              const variantPrices = await getVariantPrices(variant.id)
              if (variantPrices && variantPrices.length > 0) {
                prices.push(...variantPrices)
              }
            } catch (error) {
              console.error(`Error fetching prices for variant ${variant.id}:`, error)
            }
          }
        }

        product.prices = prices
        console.log(`Retrieved ${prices.length} prices for product ${id}`)
      }
    } catch (error) {
      console.error(`Error fetching variants for product ${id}:`, error)
      // We gaan door met het product zonder varianten
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error(`Error in /api/products/${params.id}:`, error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
