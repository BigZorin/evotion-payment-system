import Link from "next/link"
import Image from "next/image"
import { getProductWithVariantsAndPrices, isValidVariant } from "@/lib/clickfunnels"
import { formatCurrency } from "@/lib/utils"

// Voeg revalidatie toe om ervoor te zorgen dat prijsupdates snel zichtbaar zijn
export const revalidate = 60 // Revalideer elke 60 seconden

// Vervang de bestaande generateMetadata functie met deze verbeterde versie
export async function generateMetadata({ params }: { params: { productId: string } }) {
  try {
    // Haal het product op met alle varianten en prijzen
    const product = await getProductWithVariantsAndPrices(params.productId)

    if (!product) {
      return {
        title: "Product niet gevonden",
        description: "Het opgevraagde product kon niet worden gevonden.",
      }
    }

    return {
      title: `${product.name} | Evotion Coaching`,
      description: product.description?.substring(0, 160) || `Bekijk ${product.name} van Evotion Coaching.`,
      openGraph: {
        title: `${product.name} | Evotion Coaching`,
        description: product.description?.substring(0, 160) || `Bekijk ${product.name} van Evotion Coaching.`,
      },
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Product | Evotion Coaching",
      description: "Bekijk onze producten en diensten.",
    }
  }
}

// Vervang de bestaande checkout pagina met deze verbeterde versie
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/" className="text-indigo-600 hover:text-indigo-500 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug naar de homepage
          </Link>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 mb-10">
          <div className="flex items-center justify-center mb-8">
            <Image
              src="/images/evotion-logo-black.png"
              alt="Evotion Coaching"
              width={200}
              height={60}
              className="h-14 w-auto"
              priority
            />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">{product.name}</h1>

          {productDescription && (
            <div className="mb-8 max-w-3xl mx-auto">
              <div className="text-gray-700 prose prose-lg max-w-none">
                {productDescription.split("\n").map((paragraph, index) => (
                  <p key={index} className="mb-3">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Kies je optie</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full"
              >
                <div className="mb-3">
                  <span className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                    {variant.name || "Optie"}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">{variantPriceDisplay}</div>
                  {isSubscription && variantPrice?.recurring && (
                    <div className="text-sm text-gray-500 mt-1">
                      / {variantPrice.recurring_interval || "maand"}
                      {variantPrice.recurring_interval_count && variantPrice.recurring_interval_count > 1
                        ? ` (elke ${variantPrice.recurring_interval_count} ${
                            variantPrice.recurring_interval || "maanden"
                          })`
                        : ""}
                    </div>
                  )}
                </div>

                {variant.description && <div className="text-gray-600 mb-6 flex-grow">{variant.description}</div>}

                <div className="mt-auto">
                  <span className="inline-flex items-center justify-center w-full px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200">
                    Selecteer deze optie
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900">Veilig betalen</h3>
            <div className="flex flex-wrap justify-center gap-4 items-center">
              <Image src="/ideal-logo.png" alt="iDEAL" width={60} height={30} className="h-8 w-auto" />
              <Image src="/mastercard-logo.png" alt="Mastercard" width={60} height={30} className="h-8 w-auto" />
              <Image src="/visa-card-generic.png" alt="Visa" width={60} height={30} className="h-8 w-auto" />
              <Image src="/bancontact-payment.png" alt="Bancontact" width={60} height={30} className="h-8 w-auto" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Alle betalingen worden veilig verwerkt via Stripe, een gecertificeerde betalingsverwerker.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
