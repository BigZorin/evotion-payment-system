import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { getClickFunnelsProduct, getProductWithVariantsAndPrices, getClickfunnelsVariant } from "@/lib/clickfunnels"
import { ClickFunnelsCheckoutForm } from "@/components/clickfunnels-checkout-form"
import { formatCurrency } from "@/lib/utils"

// Metadata voor de pagina
export async function generateMetadata({ params }: { params: { productId: string; variantId: string } }) {
  try {
    const product = await getClickFunnelsProduct(params.productId)
    const variant = await getClickfunnelsVariant(params.variantId)

    if (!product || !variant) {
      return {
        title: "Product niet gevonden",
        description: "Het opgevraagde product kon niet worden gevonden.",
      }
    }

    return {
      title: `Betalen voor ${variant.name || product.name} | Evotion Coaching`,
      description:
        variant.description || product.seo_description || `Betaal veilig voor ${product.name} via Evotion Coaching.`,
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Betaalpagina | Evotion Coaching",
      description: "Betaal veilig voor je aankoop via Evotion Coaching.",
    }
  }
}

export default async function VariantCheckoutPage({ params }: { params: { productId: string; variantId: string } }) {
  console.log(`Variant checkout page requested for product ID: ${params.productId}, variant ID: ${params.variantId}`)

  // Haal het product op met alle varianten en prijzen
  let product
  let selectedVariant

  try {
    // Haal het volledige product op met alle varianten
    product = await getProductWithVariantsAndPrices(params.productId)
    console.log(`Product found:`, JSON.stringify(product, null, 2))

    // Zoek de geselecteerde variant
    if (product.variants && product.variants.length > 0) {
      selectedVariant = product.variants.find(
        (v: any) => v.id.toString() === params.variantId || v.public_id === params.variantId,
      )
    }

    // Als de variant niet is gevonden in het product, haal deze dan direct op
    if (!selectedVariant) {
      selectedVariant = await getClickfunnelsVariant(params.variantId)
      console.log(`Variant found directly:`, JSON.stringify(selectedVariant, null, 2))
    }
  } catch (error) {
    console.error(`Error fetching product or variant:`, error)
  }

  // Als het product of de variant niet is gevonden, toon dan een foutpagina
  if (!product || !selectedVariant) {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product of variant niet gevonden</h1>
          <p className="text-gray-600 mb-6">
            Het product of de variant die je probeert te bekijken bestaat niet of is niet meer beschikbaar.
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

  // Bepaal of het een abonnement is
  const isSubscription = selectedVariant.prices?.some((price: any) => price.recurring === true)

  // Bepaal de prijs om weer te geven
  let variantPrice = null
  let variantPriceDisplay = "Prijs niet beschikbaar"

  if (selectedVariant.prices && selectedVariant.prices.length > 0) {
    variantPrice = selectedVariant.prices[0]
    variantPriceDisplay = formatCurrency(selectedVariant.prices[0].amount)
  }

  // Bereid de productbeschrijving voor
  const productDescription = product.description || "Geen beschrijving beschikbaar"

  // Bereid de variantbeschrijving voor
  const variantDescription = selectedVariant.description || ""

  // Bereid de productkenmerken voor
  const productFeatures = [
    "Directe toegang tot het programma",
    "Professionele begeleiding",
    "Toegang tot exclusieve content",
  ]

  // Voeg variant-specifieke eigenschappen toe aan het product voor de checkout
  const productWithSelectedVariant = {
    ...product,
    selectedVariant,
    name: selectedVariant.name || product.name,
    description: variantDescription || productDescription,
    price: variantPrice ? variantPrice.amount : product.price || 0,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/checkout/${params.productId}`}
            className="text-indigo-600 hover:text-indigo-500 flex items-center"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug naar alle opties
          </Link>
        </div>

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

            <div className="inline-block bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm mb-2">
              {selectedVariant.name || "Geselecteerde variant"}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">{product.name}</h1>

            {variantDescription && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Variantbeschrijving</h2>
                <div className="text-gray-600 prose prose-sm max-w-none">
                  {variantDescription.split("\n").map((paragraph, index) => (
                    <p key={index} className="mb-2">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

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
                <span className="text-3xl font-bold text-gray-900">{variantPriceDisplay}</span>
                {isSubscription && variantPrice?.recurring && (
                  <span className="ml-2 text-gray-500">
                    / {variantPrice.recurring_interval || "maand"}
                    {variantPrice.recurring_interval_count && variantPrice.recurring_interval_count > 1
                      ? ` (elke ${variantPrice.recurring_interval_count} ${variantPrice.recurring_interval || "maanden"})`
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

            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Veilig betalen met</h2>
              <div className="flex space-x-4 items-center">
                <div className="h-8 w-16 relative">
                  <Image
                    src="/ideal-logo-19535.svg"
                    alt="iDEAL"
                    width={60}
                    height={40}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="h-8 w-16 relative">
                  <Image
                    src="/mastercard-logo.png"
                    alt="Mastercard"
                    width={60}
                    height={40}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="h-8 w-16 relative">
                  <Image
                    src="/maestro-logo.png"
                    alt="Maestro"
                    width={60}
                    height={40}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Checkout formulier */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Vul je gegevens in</h2>

            <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100 rounded-md"></div>}>
              <ClickFunnelsCheckoutForm product={productWithSelectedVariant} isSubscription={isSubscription} />
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
