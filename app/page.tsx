import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 border-b border-gray-200">
        <div className="flex justify-center">
          <img src="/images/evotion-logo-black.png" alt="Evotion Coaching" className="h-10 w-auto" />
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-[#1e1839]">Evotion Coaching Betaalsysteem</h1>
        <p className="text-lg text-gray-600 mb-8">
          Welkom bij het betaalsysteem van Evotion Coaching. Via dit platform kun je veilig en gemakkelijk betalen voor
          onze diensten en producten.
        </p>

        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4 text-[#1e1839]">Hoe het werkt</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="flex flex-col items-center">
              <div className="bg-[#1e1839]/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="font-bold text-[#1e1839]">1</span>
              </div>
              <h3 className="font-medium mb-2">Kies een dienst</h3>
              <p className="text-sm text-gray-600">Selecteer de dienst of het product dat je wilt afnemen.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-[#1e1839]/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="font-bold text-[#1e1839]">2</span>
              </div>
              <h3 className="font-medium mb-2">Vul je gegevens in</h3>
              <p className="text-sm text-gray-600">
                Voer je persoonlijke en betaalgegevens in op het beveiligde formulier.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-[#1e1839]/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="font-bold text-[#1e1839]">3</span>
              </div>
              <h3 className="font-medium mb-2">Bevestig je betaling</h3>
              <p className="text-sm text-gray-600">Rond je betaling af en ontvang direct toegang tot je aankoop.</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1e1839]/5 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4 text-[#1e1839]">Veilig betalen</h2>
          <p className="text-gray-600 mb-4">
            Al onze betalingen worden verwerkt via Stripe, een van 's werelds meest betrouwbare betaalproviders. Je
            gegevens zijn veilig en worden versleuteld verzonden.
          </p>
          <div className="flex justify-center gap-6 items-center">
            {/* iDEAL Logo */}
            <div className="h-8 w-16 relative">
              <img src="/ideal-logo-19535.svg" alt="iDEAL" className="h-full w-full object-contain" />
            </div>

            {/* Mastercard Logo */}
            <div className="h-8 w-12 relative">
              <img src="/mastercard.svg" alt="Mastercard" className="h-full w-full object-contain" />
            </div>

            {/* Maestro Logo */}
            <div className="h-8 w-12 relative">
              <img src="/maestro.svg" alt="Maestro" className="h-full w-full object-contain" />
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Link href="https://www.evotion-coaching.nl/contact">
            <Button className="bg-[#1e1839] hover:bg-[#1e1839]/90">Hulp nodig? Neem contact op</Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-12 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-600">© {new Date().getFullYear()} Evotion Coaching. Alle rechten voorbehouden.</p>
          </div>
          <div className="flex space-x-4">
            <Link href="https://www.evotion-coaching.nl/contact" className="text-gray-600 hover:text-[#1e1839]">
              Contact
            </Link>
            <Link href="https://www.evotion-coaching.nl/privacy" className="text-gray-600 hover:text-[#1e1839]">
              Privacy
            </Link>
            <Link href="https://www.evotion-coaching.nl/voorwaarden" className="text-gray-600 hover:text-[#1e1839]">
              Voorwaarden
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
