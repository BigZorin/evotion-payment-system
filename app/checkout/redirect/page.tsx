"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink } from "lucide-react"

export default function CheckoutRedirectPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [redirecting, setRedirecting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setError("Geen sessie ID gevonden. Probeer opnieuw te betalen.")
      setRedirecting(false)
      return
    }

    const redirectToStripe = async () => {
      try {
        // Controleer of Stripe.js beschikbaar is
        if (window.Stripe) {
          const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
          const { error } = await stripe.redirectToCheckout({
            sessionId,
          })

          if (error) {
            console.error("Stripe redirect error:", error)
            setError(`Er is een fout opgetreden: ${error.message}`)
            setRedirecting(false)
          }
        } else {
          // Als Stripe.js niet beschikbaar is, toon dan een handmatige link
          console.warn("Stripe.js not available")
          setRedirecting(false)
        }
      } catch (err) {
        console.error("Error redirecting to Stripe:", err)
        setError("Er is een fout opgetreden bij het doorsturen naar de betaalpagina.")
        setRedirecting(false)
      }
    }

    redirectToStripe()
  }, [sessionId])

  // Genereer de directe Stripe checkout URL
  const stripeCheckoutUrl = sessionId ? `https://checkout.stripe.com/pay/${sessionId}` : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/evotion-logo-black.png"
            alt="Evotion Coaching"
            width={180}
            height={50}
            className="h-10 w-auto"
          />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">Doorsturen naar betaalpagina</h1>

        {redirecting ? (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            </div>
            <p className="text-gray-600 mb-4">Je wordt automatisch doorgestuurd naar de betaalpagina van Stripe...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="text-red-600 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Terug naar de homepage
            </Link>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Als je niet automatisch wordt doorgestuurd, klik dan op de onderstaande knop om naar de betaalpagina te
              gaan.
            </p>
            {stripeCheckoutUrl && (
              <Button asChild className="w-full flex items-center justify-center">
                <a href={stripeCheckoutUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ga naar betaalpagina
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
