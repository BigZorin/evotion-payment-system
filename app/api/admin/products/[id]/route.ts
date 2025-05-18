import { NextResponse } from "next/server"
import { getClickFunnelsProduct, getProductVariants, getVariantPrices } from "@/lib/admin"
import { getCoursesForProduct } from "@/lib/collections"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const url = new URL(request.url)
    const refresh = url.searchParams.get("refresh") === "true"

    console.log(`API: Fetching product details for ID ${id}, refresh=${refresh}`)

    // Fetch product
    const product = await getClickFunnelsProduct(id)

    if (!product) {
      console.log(`API: Product with ID ${id} not found`)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    console.log(`API: Successfully fetched product: ${product.name}`)

    // Fetch variants
    console.log(`API: Fetching variants for product ${id}`)
    const variants = await getProductVariants(id)
    console.log(`API: Found ${variants.length} variants`)

    // Fetch prices for each variant
    const variantsWithPrices = await Promise.all(
      variants.map(async (variant) => {
        try {
          console.log(`API: Fetching prices for variant ${variant.id}`)
          const prices = await getVariantPrices(variant.id)
          console.log(`API: Found ${prices.length} prices for variant ${variant.id}`)
          return {
            ...variant,
            prices,
            default: variant.id === product.default_variant_id,
          }
        } catch (error) {
          console.error(`API: Error fetching prices for variant ${variant.id}:`, error)
          return {
            ...variant,
            prices: [],
            default: variant.id === product.default_variant_id,
          }
        }
      }),
    )

    // Find default variant and price
    const defaultVariant = variantsWithPrices.find((v) => v.id === product.default_variant_id) || null
    const defaultPrice = defaultVariant?.prices?.[0] || null

    // Combine all prices
    const allPrices = variantsWithPrices
      .filter((variant) => variant.prices && variant.prices.length > 0)
      .flatMap((variant) => variant.prices)

    // Fetch courses for this product
    console.log(`API: Fetching courses for product ${id}`)
    const courses = await getCoursesForProduct(id)
    console.log(`API: Found ${courses.length} courses for product ${id}`)

    // Combine everything
    const enrichedProduct = {
      ...product,
      variants: variantsWithPrices,
      variant: defaultVariant,
      prices: allPrices,
      defaultPrice,
      courses,
    }

    console.log(
      `API: Returning enriched product with ${enrichedProduct.variants.length} variants, ${enrichedProduct.prices.length} prices, and ${enrichedProduct.courses.length} courses`,
    )

    return NextResponse.json(enrichedProduct)
  } catch (error) {
    console.error(`Error in /api/admin/products/${params.id}:`, error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
