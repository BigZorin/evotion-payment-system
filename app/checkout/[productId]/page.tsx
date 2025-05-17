import { getProductById } from "@/lib/products"
import { notFound } from "next/navigation"
import { CheckoutForm } from "@/components/checkout-form"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"

interface CheckoutPageProps {
  params: {
    productId: string
  }
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const product = getProductById(params.productId)

  if (!product) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#1e1839] text-white">
      {/* Header met logo */}
      <header className="container mx-auto px-4 py-6 border-b border-white/10">
        <div className="flex justify-center md:justify-start">
          <Link href="/">
            <Image
              src="/images/evotion-logo-white.png"
              alt="Evotion Coaching"
              width={180}
              height={50}
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Afrekenen</h1>
          <p className="text-white/70">Vul je gegevens in om je bestelling af te ronden</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <CheckoutForm product={product} />
          </div>

          <div>
            <div className="bg-[#1e1839]/80 p-6 rounded-lg border border-white/10 shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-white">Besteloverzicht</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-white">{product.name}</h3>
                  <p className="text-sm text-white/70">{product.description}</p>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between font-medium">
                    <span>Totaal</span>
                    <span className="text-white">{formatCurrency(product.price)}</span>
                  </div>
                  <p className="text-xs text-white/70 mt-1">Inclusief BTW</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-12 border-t border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-white/70">© {new Date().getFullYear()} Evotion Coaching. Alle rechten voorbehouden.</p>
          </div>
          <div className="flex space-x-4">
            <Link href="https://www.evotion-coaching.nl/contact" className="text-white/70 hover:text-white">
              Contact
            </Link>
            <Link href="https://www.evotion-coaching.nl/privacy" className="text-white/70 hover:text-white">
              Privacy
            </Link>
            <Link href="https://www.evotion-coaching.nl/voorwaarden" className="text-white/70 hover:text-white">
              Voorwaarden
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
