import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 border-b border-gray-200">
        <div className="flex justify-center">
          <Image
            src="/images/evotion-logo-black.png"
            alt="Evotion Coaching"
            width={180}
            height={50}
            className="h-10 w-auto"
          />
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
            {/* Visa Logo */}
            <div className="h-8 w-12 relative">
              <svg viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                <path d="M290 358.6L328.2 141.4H387.3L349 358.6H290Z" fill="#00579F" />
                <path
                  d="M544.5 145.8C533.2 141.1 515.4 136 493.7 136C434.1 136 392.2 166.9 392 210.3C391.8 242.4 422.2 260.6 445.1 271.3C468.5 282.2 476.8 289.2 476.7 299.1C476.6 314.6 457.2 321.6 439.2 321.6C414.9 321.6 401.7 317.8 381.7 308.9L372.6 304.1L362.9 358.1C376.1 364.7 401.5 370.5 428 370.8C491.8 370.8 532.9 340.3 533.3 294.1C533.5 269.1 517.8 249.8 483.1 233.4C462.2 222.7 449.9 215.8 450 204.8C450 194.9 461.7 184.5 486.3 184.5C506.6 184.2 521.1 189.4 532.2 194.7L538.6 198.2L548.5 145.8"
                  fill="#00579F"
                />
                <path
                  d="M636.2 141.4H590.2C575.5 141.4 564.8 145.3 558.6 161.4L480 358.6H543.8C543.8 358.6 553.4 332.6 555.8 326.2C562.6 326.2 617.9 326.3 626.5 326.3C628.4 334.5 633.6 358.6 633.6 358.6H690L636.2 141.4ZM573.4 280.1C578.6 266.7 598.1 214.3 598.1 214.3C597.8 214.9 602.8 201.3 605.7 192.7L610.4 212.5C610.4 212.5 622.5 267.7 625 280.1H573.4Z"
                  fill="#00579F"
                />
                <path
                  d="M242.5 141.4L183 285.9L176.7 255.1C165.3 221.9 136.8 186.3 104.8 168.8L159.7 358.5H223.9L317.4 141.4H242.5Z"
                  fill="#00579F"
                />
                <path
                  d="M131.5 141.4H33.6L32.5 147.1C101.3 163.8 147.2 206.6 165.8 255.1L142.8 161.5C139.3 146.1 131.9 142.1 131.5 141.4Z"
                  fill="#FAA61A"
                />
              </svg>
            </div>

            {/* Mastercard Logo */}
            <div className="h-8 w-12 relative">
              <svg viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                <path
                  d="M490 250C490 345.3 413.3 422 318 422C222.7 422 146 345.3 146 250C146 154.7 222.7 78 318 78C413.3 78 490 154.7 490 250Z"
                  fill="#D9222A"
                />
                <path
                  d="M634 250C634 345.3 557.3 422 462 422C366.7 422 290 345.3 290 250C290 154.7 366.7 78 462 78C557.3 78 634 154.7 634 250Z"
                  fill="#EE9F2D"
                />
                <path
                  d="M462 78C413.8 78 370.3 98.8 339.5 131.5C334.5 136.8 329.8 142.5 325.5 148.5C354.5 175.3 375 210.3 375 250C375 289.7 354.5 324.7 325.5 351.5C329.8 357.5 334.5 363.2 339.5 368.5C370.3 401.2 413.8 422 462 422C557.3 422 634 345.3 634 250C634 154.7 557.3 78 462 78Z"
                  fill="#F16522"
                />
              </svg>
            </div>

            {/* iDEAL Logo */}
            <div className="h-8 w-16 relative">
              <svg viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                <path d="M146 125H634V375H146V125Z" fill="#FFFFFF" />
                <path d="M634 125H146V375H634V125ZM646 113V387H134V113H646Z" fill="#000000" />
                <path
                  d="M233.5 193.8H190V306.2H233.5C268.8 306.2 296.9 282.5 296.9 250C296.9 217.5 268.8 193.8 233.5 193.8Z"
                  fill="#C06"
                />
                <path
                  d="M233.5 193.8H190V306.2H233.5C268.8 306.2 296.9 282.5 296.9 250C296.9 217.5 268.8 193.8 233.5 193.8Z"
                  stroke="black"
                  strokeWidth="2"
                />
                <path d="M337.5 193.8H316.2V306.2H337.5V193.8Z" fill="#000000" />
                <path
                  d="M407.5 193.8H386.2V250H407.5C424.4 250 438.1 237.5 438.1 221.9C438.1 206.2 424.4 193.8 407.5 193.8Z"
                  fill="#000000"
                />
                <path
                  d="M407.5 250H386.2V306.2H407.5C424.4 306.2 438.1 293.8 438.1 278.1C438.1 262.5 424.4 250 407.5 250Z"
                  fill="#000000"
                />
                <path
                  d="M486.2 193.8H464.4V306.2H486.2C520 306.2 547.5 281.9 547.5 250C547.5 218.1 520 193.8 486.2 193.8Z"
                  fill="#000000"
                />
                <path d="M590 193.8H568.8V306.2H590V193.8Z" fill="#000000" />
              </svg>
            </div>

            {/* Bancontact Logo */}
            <div className="h-8 w-16 relative">
              <svg viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                <path d="M146 125H634V375H146V125Z" fill="#FFFFFF" />
                <path d="M634 125H146V375H634V125ZM646 113V387H134V113H646Z" fill="#000000" />
                <path
                  d="M390 160C335.3 160 290 205.3 290 260C290 314.7 335.3 360 390 360C444.7 360 490 314.7 490 260C490 205.3 444.7 160 390 160Z"
                  fill="#005498"
                />
                <path
                  d="M390 180C424.2 180 452.5 208.3 452.5 242.5C452.5 276.7 424.2 305 390 305C355.8 305 327.5 276.7 327.5 242.5C327.5 208.3 355.8 180 390 180Z"
                  fill="#FFFFFF"
                />
                <path
                  d="M390 200C413.1 200 431.9 218.8 431.9 241.9C431.9 265 413.1 283.8 390 283.8C366.9 283.8 348.1 265 348.1 241.9C348.1 218.8 366.9 200 390 200Z"
                  fill="#FFEC00"
                />
              </svg>
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
