import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { getClickFunnelsProducts } from "@/lib/admin"
import { getClickFunnelsProduct, getProductWithVariantsAndPrices } from "@/lib/clickfunnels"
import { ClickFunnelsCheckoutForm } from "@/components/clickfunnels-checkout-form"
import { formatCurrency } from "@/lib/utils"

// Metadata voor de pagina
export async function generateMetadata({ params }: { params: { productId: string } }) {
  try {
    const product = await getClickFunnelsProduct(params.productId)

    if (!product) {
      return {
        title: "Product niet gevonden",
        description: "Het opgevraagde product kon niet worden gevonden.",
      }
    }

    return {
      title: `Betalen voor ${product.name} | Evotion Coaching`,
      description: product.seo_description || `Betaal veilig voor ${product.name} via Evotion Coaching.`,
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Betaalpagina | Evotion Coaching",
      description: "Betaal veilig voor je aankoop via Evotion Coaching.",
    }
  }
}

export default async function CheckoutPage({ params }: { params: { productId: string } }) {
  console.log(`Checkout page requested for product ID: ${params.productId}`)

  // Probeer eerst het product direct op te halen
  let product
  try {
    console.log(`Attempting to fetch product with ID: ${params.productId}`)
    product = await getProductWithVariantsAndPrices(params.productId)
    console.log(`Product found:`, JSON.stringify(product, null, 2))
  } catch (error) {
    console.error(`Error fetching product ${params.productId} directly:`, error)

    // Als dat mislukt, probeer alle producten op te halen en zoek het product op basis van ID of public_id
    try {
      console.log(`Attempting to fetch all products and find product with ID: ${params.productId}`)
      const allProducts = await getClickFunnelsProducts()
      console.log(`Fetched ${allProducts.length} products`)

      // Filter op niet-gearchiveerde producten
      const activeProducts = allProducts.filter((p) => p.archived !== true)
      console.log(`Found ${activeProducts.length} active products`)

      // Zoek het product op basis van ID of public_id
      product = activeProducts.find(
        (p) =>
          p.public_id === params.productId || p.id.toString() === params.productId || `cf-${p.id}` === params.productId,
      )

      // Controleer of productId een slug is (bijv. "online-coaching")
      if (!product && params.productId.includes("-")) {
        console.log(`Checking if ${params.productId} is a slug`)
        const slugParts = params.productId.split("-")
        // Zoek producten die alle delen van de slug in hun naam hebben
        const possibleProducts = activeProducts.filter((p) => {
          const name = p.name.toLowerCase()
          return slugParts.every((part) => name.includes(part.toLowerCase()))
        })

        if (possibleProducts.length > 0) {
          console.log(`Found ${possibleProducts.length} products matching slug ${params.productId}`)
          product = possibleProducts[0] // Neem de eerste match
        }
      }

      // Speciale behandeling voor 12-weken-vetverlies
      if (!product && params.productId === "12-weken-vetverlies") {
        console.log(`Special case: looking for "12-weken-vetverlies" product`)
        product = activeProducts.find((p) => p.name.toLowerCase().includes("12-weken vetverlies"))
      }

      // Speciale behandeling voor "online coaching"
      if (!product && (params.productId === "online-coaching" || params.productId.includes("coaching"))) {
        console.log(`Special case: looking for "online coaching" product`)
        product = activeProducts.find((p) => p.name.toLowerCase().includes("coaching"))
      }

      if (product) {
        console.log(`Found product via alternative method:`, JSON.stringify(product, null, 2))
        // Als we het product hebben gevonden, haal dan de volledige details op
        try {
          product = await getProductWithVariantsAndPrices(product.id.toString())
        } catch (variantError) {
          console.error(`Error fetching variants for product ${product.id}:`, variantError)
          // We gebruiken het product zonder varianten als fallback
        }
      } else {
        console.error(`Product with ID ${params.productId} not found in any products`)
      }
    } catch (secondError) {
      console.error(`Error in fallback product search:`, secondError)
    }
  }

  // Als het product nog steeds niet is gevonden, toon dan een foutpagina
  if (!product) {
    console.error(`Product with ID ${params.productId} not found, returning 404`)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <Image
            src="/images/evotion-logo-black.png"
            alt="Evotion Coaching"
            width={180}
            height={50}
            className="h-10 w-auto mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product niet gevonden</h1>
          <p className="text-gray-600 mb-6">
            Het product dat je probeert te bekijken bestaat niet of is niet meer beschikbaar.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Terug naar de homepage
          </Link>
        </div>
      </div>
    )
  }

  // Bepaal of het product een abonnement is
  const isSubscription =
    product.prices?.some((price: any) => price.recurring === true) ||
    product.variants?.some((variant: any) => variant.prices?.some((price: any) => price.recurring === true))

  // Bepaal de standaard prijs om weer te geven
  let defaultPrice = null
  let defaultPriceDisplay = "Prijs niet beschikbaar"

  if (product.defaultPrice) {
    defaultPrice = product.defaultPrice
    defaultPriceDisplay = formatCurrency(product.defaultPrice.amount)
  } else if (product.prices && product.prices.length > 0) {
    defaultPrice = product.prices[0]
    defaultPriceDisplay = formatCurrency(product.prices[0].amount)
  } else if (
    product.variants &&
    product.variants.length > 0 &&
    product.variants[0].prices &&
    product.variants[0].prices.length > 0
  ) {
    defaultPrice = product.variants[0].prices[0]
    defaultPriceDisplay = formatCurrency(product.variants[0].prices[0].amount)
  }

  // Bereid de productbeschrijving voor
  const productDescription = product.description || "Geen beschrijving beschikbaar"

  // Bereid de productkenmerken voor
  const productFeatures = [
    "Directe toegang tot het programma",
    "Professionele begeleiding",
    "Toegang tot exclusieve content",
  ]

  // Controleer of er varianten zijn
  const hasVariants = product.variants && product.variants.length > 1

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Productinformatie */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-center mb-6">
              <Image
                src="/images/evotion-logo-black.png"
                alt="Evotion Coaching"
                width={200}
                height={60}
                className="h-12 w-auto"
              />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">{product.name}</h1>

            {productDescription && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Productbeschrijving</h2>
                <div className="text-gray-600 prose prose-sm max-w-none">
                  {productDescription.split("\n").map((paragraph, index) => (
                    <p key={index} className="mb-2">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Prijs</h2>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">{defaultPriceDisplay}</span>
                {isSubscription && defaultPrice?.recurring && (
                  <span className="ml-2 text-gray-500">
                    / {defaultPrice.recurring_interval || "maand"}
                    {defaultPrice.recurring_interval_count && defaultPrice.recurring_interval_count > 1
                      ? ` (elke ${defaultPrice.recurring_interval_count} ${defaultPrice.recurring_interval || "maanden"})`
                      : ""}
                  </span>
                )}
              </div>

              {isSubscription && (
                <p className="mt-2 text-sm text-gray-500">
                  Dit is een abonnement dat automatisch wordt verlengd. Je kunt op elk moment opzeggen.
                </p>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Wat krijg je?</h2>
              <ul className="space-y-2">
                {productFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {hasVariants && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Beschikbare varianten</h2>
                <div className="space-y-2">
                  {product.variants.map((variant: any) => {
                    // Bepaal de prijs voor deze variant
                    const variantPrice =
                      variant.prices && variant.prices.length > 0
                        ? formatCurrency(variant.prices[0].amount)
                        : "Prijs niet beschikbaar"

                    return (
                      <Link
                        key={variant.id}
                        href={`/checkout/${product.id}/variant/${variant.id}`}
                        className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium text-gray-900">{variant.name}</h3>
                            {variant.description && <p className="text-sm text-gray-500">{variant.description}</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{variantPrice}</p>
                            <span className="text-sm text-blue-600">Selecteer →</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Veilig betalen met</h2>
              <div className="flex space-x-4 items-center">
                <div className="h-8 w-16 relative">
                  <img src="/ideal-logo-19535.svg" alt="iDEAL" className="h-full w-full object-contain" />
                </div>
                <div className="h-8 w-16 relative">
                  <img src="/mastercard.svg" alt="Mastercard" className="h-full w-full object-contain" />
                </div>
                <div className="h-8 w-16 relative">
                  <img src="/maestro.svg" alt="Maestro" className="h-full w-full object-contain" />
                </div>
              </div>
            </div>
          </div>

          {/* Checkout formulier */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Vul je gegevens in</h2>

            <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100 rounded-md"></div>}>
              <ClickFunnelsCheckoutForm product={product} isSubscription={isSubscription} />
            </Suspense>

            <div className="mt-6 text-sm text-gray-500">
              <p>
                Door te betalen ga je akkoord met onze{" "}
                <a href="#" className="text-indigo-600 hover:text-indigo-500">
                  algemene voorwaarden
                </a>{" "}
                en{" "}
                <a href="#" className="text-indigo-600 hover:text-indigo-500">
                  privacybeleid
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
