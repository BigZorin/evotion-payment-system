import { redirect } from "next/navigation"
import { handleSuccessfulPayment } from "@/lib/actions"
import { CheckCircle, AlertTriangle, BookOpen } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface SuccessPageProps {
  searchParams: {
    session_id?: string
  }
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const sessionId = searchParams.session_id

  if (!sessionId) {
    redirect("/")
  }

  const {
    success,
    partialSuccess,
    customerEmail,
    customerName,
    productName,
    error,
    stripeCustomerId,
    hasEnrollment,
    courseId,
  } = await handleSuccessfulPayment(sessionId)

  return (
    <div className="min-h-screen bg-white text-[#1e1839]">
      {/* Header met logo */}
      <header className="container mx-auto px-4 py-6 border-b border-[#1e1839]/10">
        <div className="flex justify-center md:justify-start">
          <Link href="/">
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

      <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
        {success ? (
          <>
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-white p-6 border border-[#1e1839]/20 shadow-md">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-6 text-[#1e1839]">Bedankt voor je bestelling!</h1>

            <div className="bg-white rounded-lg p-8 mb-8 border border-[#1e1839]/10 shadow-md">
              <p className="text-lg mb-6">
                We hebben je betaling ontvangen en een bevestiging is verzonden naar{" "}
                <span className="font-semibold text-[#1e1839]">{customerEmail}</span>.
              </p>
              <p className="text-lg mb-6">Je account is succesvol aangemaakt en je hebt nu toegang tot je aankoop.</p>

              {hasEnrollment && (
                <div className="bg-[#1e1839]/5 border border-[#1e1839]/20 rounded-lg p-4 mb-6 flex items-center">
                  <BookOpen className="h-6 w-6 text-[#1e1839] mr-3 flex-shrink-0" />
                  <p className="text-[#1e1839]">
                    Je bent succesvol ingeschreven voor de cursus. Je kunt direct beginnen met het volgen van de lessen.
                  </p>
                </div>
              )}

              {stripeCustomerId && (
                <div className="bg-[#1e1839]/5 border border-[#1e1839]/10 rounded-lg p-4 mb-6">
                  <p className="text-[#1e1839]/80">
                    Er is ook een klantaccount voor je aangemaakt in ons betalingssysteem. Bij toekomstige aankopen kun
                    je sneller afrekenen.
                  </p>
                </div>
              )}

              <div className="border-t border-[#1e1839]/10 pt-6 mt-6">
                <h2 className="text-xl font-semibold mb-4 text-[#1e1839]">Volgende stappen</h2>
                <p className="mb-6">
                  Je kunt nu inloggen op het Evotion platform om toegang te krijgen tot{" "}
                  {productName || "je gekochte diensten"}.
                </p>

                <Link href="https://www.evotion-coaching.nl/mijn-account">
                  <Button className="bg-[#1e1839] hover:bg-[#1e1839]/90 text-white px-8 py-3 rounded-md font-medium transition-colors duration-300">
                    Ga naar Mijn Account
                  </Button>
                </Link>

                {hasEnrollment && (
                  <div className="mt-4">
                    <Link href={`https://www.evotion-coaching.nl/cursus/${courseId}`}>
                      <Button
                        className="bg-white hover:bg-[#1e1839]/10 text-[#1e1839] px-8 py-3 rounded-md font-medium transition-colors duration-300 border border-[#1e1839]"
                        variant="outline"
                      >
                        Ga direct naar de cursus
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8">
              <Link href="https://www.evotion-coaching.nl">
                <Button
                  variant="outline"
                  className="border-[#1e1839]/50 text-[#1e1839] hover:bg-[#1e1839]/10 hover:border-[#1e1839]"
                >
                  Terug naar Evotion Coaching
                </Button>
              </Link>
            </div>
          </>
        ) : partialSuccess ? (
          <>
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-white p-6 border border-yellow-500/50 shadow-md">
                <AlertTriangle className="h-16 w-16 text-yellow-500" />
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-6 text-[#1e1839]">Bedankt voor je bestelling!</h1>

            <div className="bg-white rounded-lg p-8 mb-8 border border-[#1e1839]/10 shadow-md">
              <p className="text-lg mb-6">
                We hebben je betaling ontvangen en een bevestiging is verzonden naar{" "}
                <span className="font-semibold text-[#1e1839]">{customerEmail}</span>.
              </p>

              {stripeCustomerId && (
                <div className="bg-[#1e1839]/5 border border-[#1e1839]/10 rounded-lg p-4 mb-6">
                  <p className="text-[#1e1839]/80">
                    Er is een klantaccount voor je aangemaakt in ons betalingssysteem. Bij toekomstige aankopen kun je
                    sneller afrekenen.
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">
                  {error ||
                    "Er is een klein probleem opgetreden bij het aanmaken van je account. Ons team zal contact met je opnemen om dit op te lossen."}
                </p>
              </div>

              <div className="mt-6">
                <Link href="https://www.evotion-coaching.nl">
                  <Button className="bg-[#1e1839] hover:bg-[#1e1839]/90 text-white px-8 py-3 rounded-md font-medium transition-colors duration-300">
                    Terug naar Evotion Coaching
                  </Button>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-white p-6 border border-red-500/50 shadow-md">
                <AlertTriangle className="h-16 w-16 text-red-500" />
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-6 text-[#1e1839]">Er is iets misgegaan</h1>

            <div className="bg-white rounded-lg p-8 mb-8 border border-[#1e1839]/10 shadow-md">
              <p className="text-lg mb-6">
                {error || "We konden je betaling niet verwerken. Neem contact op met onze klantenservice."}
              </p>

              <div className="mt-6">
                <Link href="https://www.evotion-coaching.nl">
                  <Button className="bg-[#1e1839] hover:bg-[#1e1839]/90 text-white px-8 py-3 rounded-md font-medium transition-colors duration-300">
                    Terug naar Evotion Coaching
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
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
