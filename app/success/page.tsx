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
    invoiceUrl,
    invoicePdf,
    enrolledCourses,
    failedCourses,
  } = await handleSuccessfulPayment(sessionId)

  return (
    <div className="min-h-screen bg-[#1e1839] text-white">
      {/* Header met logo */}
      <header className="container mx-auto px-4 py-6 border-b border-white/10">
        <div className="flex justify-center md:justify-start">
          <Link href="https://www.evotion-coaching.nl">
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

      <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
        {success ? (
          <>
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-[#1e1839]/80 p-6 border border-white/20 shadow-md">
                <CheckCircle className="h-16 w-16 text-green-400" />
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-6 text-white">Bedankt voor je bestelling!</h1>

            <div className="bg-[#1e1839]/80 rounded-lg p-8 mb-8 border border-white/10 shadow-md">
              <p className="text-lg mb-6">
                We hebben je betaling ontvangen en een bevestiging is verzonden naar{" "}
                <span className="font-semibold text-white">{customerEmail}</span>.
              </p>
              <p className="text-lg mb-6">Je account is succesvol aangemaakt en je hebt nu toegang tot je aankoop.</p>

              {hasEnrollment && (
                <div className="bg-white/10 border border-white/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-3">
                    <BookOpen className="h-6 w-6 text-white mr-3 flex-shrink-0" />
                    <p className="text-white font-medium">
                      Je bent succesvol ingeschreven voor{" "}
                      {enrolledCourses.length === 1 ? "de cursus" : "de volgende cursussen"}:
                    </p>
                  </div>

                  {enrolledCourses.length > 0 && (
                    <ul className="list-disc pl-10 space-y-1 text-white/90">
                      {enrolledCourses.includes("eWbLVk") && (
                        <li>
                          <Link
                            href="https://www.evotion-coaching.nl/community/c/12-weken-vetverlies-programma-cursus"
                            className="text-white hover:underline"
                          >
                            12-Weken Vetverlies Programma
                          </Link>
                        </li>
                      )}
                      {enrolledCourses
                        .filter((id) => id !== "eWbLVk")
                        .map((courseId, index) => (
                          <li key={index}>
                            Cursus ID: {courseId}{" "}
                            {/* Vervang dit door de echte cursus naam en link wanneer beschikbaar */}
                          </li>
                        ))}
                    </ul>
                  )}

                  {failedCourses.length > 0 && (
                    <div className="mt-3 bg-red-900/20 border border-red-500/30 p-3 rounded-md">
                      <p className="text-red-200 text-sm">
                        Er was een probleem bij het inschrijven voor sommige cursussen. Neem contact op met onze
                        klantenservice.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {stripeCustomerId && (
                <div className="bg-white/10 border border-white/10 rounded-lg p-4 mb-6">
                  <p className="text-white/80">
                    Er is ook een klantaccount voor je aangemaakt in ons betalingssysteem. Bij toekomstige aankopen kun
                    je sneller afrekenen.
                  </p>
                </div>
              )}

              <div className="border-t border-white/10 pt-6 mt-6">
                <h2 className="text-xl font-semibold mb-4 text-white">Volgende stappen</h2>
                <p className="mb-6">
                  Je kunt nu inloggen op het Evotion platform om toegang te krijgen tot{" "}
                  {productName || "je gekochte diensten"}.
                </p>

                <Link href="https://www.evotion-coaching.nl/contacts/sign_in">
                  <Button className="bg-white hover:bg-white/90 text-[#1e1839] px-8 py-3 rounded-md font-medium transition-colors duration-300">
                    Inloggen op Evotion
                  </Button>
                </Link>

                {hasEnrollment && enrolledCourses.includes("eWbLVk") && (
                  <div className="mt-4">
                    <Link href="https://www.evotion-coaching.nl/community/c/12-weken-vetverlies-programma-cursus">
                      <Button
                        className="bg-[#1e1839] hover:bg-[#1e1839]/80 text-white px-8 py-3 rounded-md font-medium transition-colors duration-300 border border-white"
                        variant="outline"
                      >
                        Ga direct naar de 12-Weken Vetverlies cursus
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {invoiceUrl && (
              <div className="mt-4">
                <p className="text-white/80 mb-2">Je factuur is beschikbaar:</p>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 justify-center">
                  <Link href={invoiceUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      className="border-white/50 text-white hover:bg-white/10 hover:border-white w-full sm:w-auto"
                    >
                      Bekijk factuur online
                    </Button>
                  </Link>
                  {invoicePdf && (
                    <Link href={invoicePdf} target="_blank" rel="noopener noreferrer">
                      <Button
                        variant="outline"
                        className="border-white/50 text-white hover:bg-white/10 hover:border-white w-full sm:w-auto"
                      >
                        Download PDF factuur
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8">
              <Link href="https://www.evotion-coaching.nl">
                <Button variant="outline" className="border-white/50 text-white hover:bg-white/10 hover:border-white">
                  Terug naar Evotion Coaching
                </Button>
              </Link>
            </div>
          </>
        ) : partialSuccess ? (
          <>
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-[#1e1839]/80 p-6 border border-yellow-500/50 shadow-md">
                <AlertTriangle className="h-16 w-16 text-yellow-400" />
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-6 text-white">Bedankt voor je bestelling!</h1>

            <div className="bg-[#1e1839]/80 rounded-lg p-8 mb-8 border border-white/10 shadow-md">
              <p className="text-lg mb-6">
                We hebben je betaling ontvangen en een bevestiging is verzonden naar{" "}
                <span className="font-semibold text-white">{customerEmail}</span>.
              </p>

              {stripeCustomerId && (
                <div className="bg-white/10 border border-white/10 rounded-lg p-4 mb-6">
                  <p className="text-white/80">
                    Er is een klantaccount voor je aangemaakt in ons betalingssysteem. Bij toekomstige aankopen kun je
                    sneller afrekenen.
                  </p>
                </div>
              )}

              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-200">
                  {error ||
                    "Er is een klein probleem opgetreden bij het aanmaken van je account. Ons team zal contact met je opnemen om dit op te lossen."}
                </p>
              </div>

              <div className="mt-6">
                <Link href="https://www.evotion-coaching.nl">
                  <Button className="bg-white hover:bg-white/90 text-[#1e1839] px-8 py-3 rounded-md font-medium transition-colors duration-300">
                    Terug naar Evotion Coaching
                  </Button>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-[#1e1839]/80 p-6 border border-red-500/50 shadow-md">
                <AlertTriangle className="h-16 w-16 text-red-400" />
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-6 text-white">Er is iets misgegaan</h1>

            <div className="bg-[#1e1839]/80 rounded-lg p-8 mb-8 border border-white/10 shadow-md">
              <p className="text-lg mb-6">
                {error || "We konden je betaling niet verwerken. Neem contact op met onze klantenservice."}
              </p>

              <div className="mt-6">
                <Link href="https://www.evotion-coaching.nl">
                  <Button className="bg-white hover:bg-white/90 text-[#1e1839] px-8 py-3 rounded-md font-medium transition-colors duration-300">
                    Terug naar Evotion Coaching
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
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
