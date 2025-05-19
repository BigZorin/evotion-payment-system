"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function RedirectPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stripeUrl, setStripeUrl] = useState<string | null>(null)

  useEffect(() => {
    const redirectToStripe = async () => {
      if (!sessionId) {
        setError("Geen sessie ID gevonden. Ga terug en probeer het opnieuw.")
        setIsLoading(false)
        return
      }

      try {
        // Probeer de Stripe checkout URL op te halen
        const response = await fetch(`/api/checkout/get-session?session_id=${sessionId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Er is een fout opgetreden bij het ophalen van de betaalsessie")
        }

        if (data.url) {
          setStripeUrl(data.url)
          // Redirect naar Stripe
          window.location.href = data.url
        } else {
          throw new Error("Geen checkout URL ontvangen van de server")
        }
      } catch (error: any) {
        console.error("Error redirecting to Stripe:", error)
        setError(error.message || "Er is een fout opgetreden bij het doorsturen naar de betaalpagina")
        setIsLoading(false)
      }
    }

    redirectToStripe()
  }, [sessionId])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Doorsturen naar betaalpagina</CardTitle>
          <CardDescription>
            {isLoading ? "Je wordt doorgestuurd naar de betaalpagina..." : "Er is een probleem opgetreden"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-gray-600">Even geduld, je wordt doorgestuurd naar Stripe...</p>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-red-600 mb-4">{error}</p>
              {stripeUrl && (
                <div className="mt-4">
                  <p className="text-gray-600 mb-2">
                    Als je niet automatisch wordt doorgestuurd, klik dan op de onderstaande knop:
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => {
                      window.location.href = stripeUrl
                    }}
                  >
                    Ga naar betaalpagina
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href="/" passHref>
            <Button variant="outline">Terug naar home</Button>
          </Link>
          <Link href={`/checkout`} passHref>
            <Button variant="outline">Terug naar checkout</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
