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

// Helper functie om de cursus naam te krijgen op basis van ID
function getCourseName(courseId: string): { name: string; url: string; description: string } {
  switch (courseId) {
    case "eWbLVk":
      return {
        name: "12-Weken Vetverlies Programma",
        url: "https://www.evotion-coaching.nl/community/c/12-weken-vetverlies-programma-cursus",
        description: "Compleet programma voor duurzaam vetverlies",
      }
    case "vgDnxN":
      return {
        name: "Uitleg van Oefeningen",
        url: "https://www.evotion-coaching.nl/community/c/uitleg-van-oefeningen",
        description: "Uitleg van oefeningen in je trainingsschema",
      }
    case "JMaGxK":
      return {
        name: "Evotion-Coaching App Handleiding",
        url: "https://www.evotion-coaching.nl/community/c/app-handleiding",
        description: "Uitleg hoe de Evotion-Coaching app werkt",
      }
    default:
      return {
        name: `Cursus (ID: ${courseId})`,
        url: "https://www.evotion-coaching.nl/community",
        description: "Cursusmateriaal",
      }
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
    alreadyEnrolledCourses,
    failedCourses,
  } = await handleSuccessfulPayment(sessionId)

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

      <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
        {success ? (
          <>
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-[#1e1839] p-6 shadow-md">
                <CheckCircle className="h-16 w-16 text-white" />
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
                <div className="bg-[#1e1839]/5 border border-[#1e1839]/10 rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-3">
                    <BookOpen className="h-6 w-6 text-[#1e1839] mr-3 flex-shrink-0" />
                    <p className="text-[#1e1839] font-medium">Je hebt toegang tot de volgende cursussen:</p>
                  </div>

                  {enrolledCourses.length > 0 && (
                    <>
                      <p className="text-[#1e1839] font-medium text-left mb-2">Nieuwe inschrijvingen:</p>
                      <ul className="list-disc pl-10 space-y-3 text-[#1e1839]/90 mb-4">
                        {enrolledCourses.map((courseId, index) => {
                          const course = getCourseName(courseId)
                          return (
                            <li key={index}>
                              <div className="flex flex-col items-start">
                                <Link href={course.url} className="text-[#1e1839] font-medium hover:underline">
                                  {course.name}
                                </Link>
                                <span className="text-sm text-[#1e1839]/70">{course.description}</span>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  )}

                  {alreadyEnrolledCourses && alreadyEnrolledCourses.length > 0 && (
                    <>
                      <p className="text-[#1e1839] font-medium text-left mb-2">Je had al toegang tot:</p>
                      <ul className="list-disc pl-10 space-y-3 text-[#1e1839]/90">
                        {alreadyEnrolledCourses.map((courseId, index) => {
                          const course = getCourseName(courseId)
                          return (
                            <li key={index}>
                              <div className="flex flex-col items-start">
                                <Link href={course.url} className="text-[#1e1839] font-medium hover:underline">
                                  {course.name}
                                </Link>
                                <span className="text-sm text-[#1e1839]/70">{course.description}</span>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  )}

                  {failedCourses.length > 0 && (
                    <div className="mt-3 bg-red-50 border border-red-200 p-3 rounded-md">
                      <p className="text-red-700 text-sm">
                        Er was een probleem bij het inschrijven voor sommige cursussen. Neem contact op met onze
                        klantenservice.
                      </p>
                    </div>
                  )}
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

                <Link href="https://www.evotion-coaching.nl/contacts/sign_in">
                  <Button className="bg-[#1e1839] hover:bg-white hover:text-[#1e1839] text-white border border-[#1e1839] px-8 py-3 rounded-md font-medium transition-colors duration-300">
                    Inloggen op Evotion
                  </Button>
                </Link>

                {hasEnrollment && (
                  <div className="mt-4 space-y-2">
                    {(enrolledCourses.includes("eWbLVk") || alreadyEnrolledCourses?.includes("eWbLVk")) && (
                      <Link href="https://www.evotion-coaching.nl/community/c/12-weken-vetverlies-programma-cursus">
                        <Button
                          className="bg-[#1e1839] hover:bg-white text-white hover:text-[#1e1839] px-8 py-3 rounded-md font-medium transition-colors duration-300 border border-[#1e1839] w-full"
                          variant="outline"
                        >
                          Ga naar 12-Weken Vetverlies Programma
                        </Button>
                      </Link>
                    )}
                    {(enrolledCourses.includes("vgDnxN") || alreadyEnrolledCourses?.includes("vgDnxN")) && (
                      <Link href="https://www.evotion-coaching.nl/community/c/uitleg-van-oefeningen">
                        <Button
                          className="bg-[#1e1839] hover:bg-white text-white hover:text-[#1e1839] px-8 py-3 rounded-md font-medium transition-colors duration-300 border border-[#1e1839] w-full"
                          variant="outline"
                        >
                          Bekijk uitleg van oefeningen in je trainingsschema
                        </Button>
                      </Link>
                    )}
                    {(enrolledCourses.includes("JMaGxK") || alreadyEnrolledCourses?.includes("JMaGxK")) && (
                      <Link href="https://www.evotion-coaching.nl/community/c/app-handleiding">
                        <Button
                          className="bg-[#1e1839] hover:bg-white text-white hover:text-[#1e1839] px-8 py-3 rounded-md font-medium transition-colors duration-300 border border-[#1e1839] w-full"
                          variant="outline"
                        >
                          Leer hoe de Evotion-Coaching app werkt
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {invoiceUrl && (
              <div className="mt-4">
                <p className="text-[#1e1839]/80 mb-2">Je factuur is beschikbaar:</p>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 justify-center">
                  <Link href={invoiceUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      variant="outline"
                      className="border-[#1e1839] text-[#1e1839] hover:bg-[#1e1839] hover:text-white w-full sm:w-auto"
                    >
                      Bekijk factuur online
                    </Button>
                  </Link>
                  {invoicePdf && (
                    <Link href={invoicePdf} target="_blank" rel="noopener noreferrer">
                      <Button
                        variant="outline"
                        className="border-[#1e1839] text-[#1e1839] hover:bg-[#1e1839] hover:text-white w-full sm:w-auto"
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
                <Button
                  variant="outline"
                  className="border-[#1e1839] text-[#1e1839] hover:bg-[#1e1839] hover:text-white"
                >
                  Terug naar Evotion Coaching
                </Button>
              </Link>
            </div>
          </>
        ) : partialSuccess ? (
          <>
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-amber-50 p-6 border border-amber-200 shadow-md">
                <AlertTriangle className="h-16 w-16 text-amber-500" />
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

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800">
                  {error ||
                    "Er is een klein probleem opgetreden bij het aanmaken van je account. Ons team zal contact met je opnemen om dit op te lossen."}
                </p>
              </div>

              <div className="mt-6">
                <Link href="https://www.evotion-coaching.nl">
                  <Button className="bg-[#1e1839] hover:bg-white hover:text-[#1e1839] text-white border border-[#1e1839] px-8 py-3 rounded-md font-medium transition-colors duration-300">
                    Terug naar Evotion Coaching
                  </Button>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-red-50 p-6 border border-red-200 shadow-md">
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
                  <Button className="bg-[#1e1839] hover:bg-white hover:text-[#1e1839] text-white border border-[#1e1839] px-8 py-3 rounded-md font-medium transition-colors duration-300">
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
