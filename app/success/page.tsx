import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { PaymentStatus } from "@/components/payment-status"

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const sessionId = searchParams.session_id

  if (!sessionId) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image
            src="/images/evotion-logo-black.png"
            alt="Evotion Coaching"
            width={200}
            height={60}
            className="h-16 w-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Bedankt voor je bestelling!</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We hebben je bestelling ontvangen en verwerken deze zo snel mogelijk.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Suspense
            fallback={
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-full"></div>
                <div className="h-24 bg-gray-200 rounded w-full"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            }
          >
            <PaymentStatus sessionId={sessionId as string} />
          </Suspense>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Wat nu?</span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-sm text-gray-500">
                Je ontvangt binnen enkele minuten een bevestigingsmail met alle details van je bestelling. Als je binnen
                15 minuten geen e-mail hebt ontvangen, controleer dan je spam-folder of neem contact met ons op.
              </p>

              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Je krijgt direct toegang</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        Je account is aangemaakt en je hebt nu toegang tot alle materialen. Je kunt direct inloggen met
                        je e-mailadres.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Terug naar de homepage
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
