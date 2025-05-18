import Link from "next/link"
import Image from "next/image"
import { getClickFunnelsProduct, getProductWithVariantsAndPrices, isValidVariant } from "@/lib/clickfunnels"
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
      title: `${product.name} | Evotion Coaching`,
      description: product.seo_description || `Bekijk ${product.name} van Evotion Coaching.`,
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Product | Evotion Coaching",
      description: "Bekijk onze producten en diensten.",
    }
  }
}

export default async function CheckoutPage({ params }: { params: { productId: string } }) {
  console.log(`Checkout page requested for product ID: ${params.productId}`)

  // Haal het product op met alle varianten en prijzen
  let product
  try {
    product = await getProductWithVariantsAndPrices(params.productId)
    console.log(`Product found with ${product.variants?.length || 0} variants`)
  } catch (error) {
    console.error(`Error fetching product:`, error)
  }

  // Als het product niet is gevonden, toon dan een foutpagina
  if (!product) {
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

  // Controleer of er geldige varianten zijn
  const validVariants = product.variants?.filter(isValidVariant) || []

  // Als er geen geldige varianten zijn, toon dan een bericht
  if (validVariants.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-gray-600 mb-6">
            Dit product heeft momenteel geen beschikbare opties. Probeer het later nog eens of neem contact op met onze
            klantenservice.
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

  // Bereid de productbeschrijving voor
  const productDescription = product.description || "Geen beschrijving beschikbaar"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/" className="text-indigo-600 hover:text-indigo-500 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug naar de homepage
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
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
              <div className="text-gray-600 prose prose-sm max-w-none">
                {productDescription.split("\n").map((paragraph, index) => (
                  <p key={index} className="mb-2">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Kies een optie</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {validVariants.map((variant) => {
            // Bepaal de prijs om weer te geven
            let variantPrice = null
            let variantPriceDisplay = "Prijs niet beschikbaar"
            let isSubscription = false

            if (variant.prices && variant.prices.length > 0) {
              variantPrice = variant.prices[0]
              variantPriceDisplay = formatCurrency(variantPrice.amount)
              isSubscription = variantPrice.recurring === true
            }

            return (
              <Link
                key={variant.id}
                href={`/checkout/${params.productId}/variant/${variant.public_id || variant.id}`}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
              >
                <div className="mb-2">
                  <span className="inline-block bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm">
                    {variant.name || "Optie"}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="text-xl font-bold text-gray-900">{variantPriceDisplay}</div>
                  {isSubscription && variantPrice?.recurring && (
                    <div className="text-sm text-gray-500">
                      / {variantPrice.recurring_interval || "maand"}
                      {variantPrice.recurring_interval_count && variantPrice.recurring_interval_count > 1
                        ? ` (elke ${variantPrice.recurring_interval_count} ${
                            variantPrice.recurring_interval || "maanden"
                          })`
                        : ""}
                    </div>
                  )}
                </div>

                {variant.description && (
                  <div className="text-gray-600 text-sm mb-4 line-clamp-3">{variant.description}</div>
                )}

                <div className="mt-4">
                  <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Selecteer
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
