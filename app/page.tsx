import { ProductList } from "@/components/product-list"
import { products } from "@/lib/products"
import Link from "next/link"
import Image from "next/image"

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#1e1839]">
      {/* Header met logo */}
      <header className="container mx-auto px-4 py-6 border-b border-[#1e1839]/10">
        <div className="flex justify-center md:justify-start">
          <Link href="https://www.evotion-coaching.nl">
            <Image
              src="/images/evotion-logo-black.png"
              alt="Evotion Coaching"
              width={180}
              height={50}
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-[#1e1839]">Evotion Coaching Diensten</h1>
          <p className="text-xl text-[#1e1839]/70 max-w-3xl mx-auto">
            Kies een dienst om direct online te betalen via iDeal of creditcard
          </p>
        </div>

        <ProductList products={products} />
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-12 border-t border-[#1e1839]/10">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-[#1e1839]/70">
              © {new Date().getFullYear()} Evotion Coaching. Alle rechten voorbehouden.
            </p>
          </div>
          <div className="flex space-x-4">
            <Link href="https://www.evotion-coaching.nl/contact" className="text-[#1e1839]/70 hover:text-[#1e1839]">
              Contact
            </Link>
            <Link href="https://www.evotion-coaching.nl/privacy" className="text-[#1e1839]/70 hover:text-[#1e1839]">
              Privacy
            </Link>
            <Link href="https://www.evotion-coaching.nl/voorwaarden" className="text-[#1e1839]/70 hover:text-[#1e1839]">
              Voorwaarden
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
