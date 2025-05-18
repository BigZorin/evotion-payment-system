"use client"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, XCircle } from "lucide-react"

export function StripeDebugClient() {
  const [stripeLoaded, setStripeLoaded] = useState<boolean | null>(null)
  const [stripeKey, setStripeKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [testSessionId, setTestSessionId] = useState<string | null>(null)
  const [testSessionCreating, setTestSessionCreating] = useState(false)
  const [testSessionError, setTestSessionError] = useState<string | null>(null)

  useEffect(() => {
    const checkStripe = async () => {
      try {
        setIsLoading(true)
        const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        setStripeKey(key || null)

        if (!key) {
          setStripeLoaded(false)
          setError("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is niet geconfigureerd")
          return
        }

        // Probeer Stripe te laden
        const stripePromise = loadStripe(key)
        const stripe = await stripePromise

        if (stripe) {
          setStripeLoaded(true)
        } else {
          setStripeLoaded(false)
          setError("Stripe kon niet worden geladen")
        }
      } catch (err: any) {
        setStripeLoaded(false)
        setError(err.message || "Er is een fout opgetreden bij het laden van Stripe")
      } finally {
        setIsLoading(false)
      }
    }

    checkStripe()
  }, [])

  const createTestSession = async () => {
    try {
      setTestSessionCreating(true)
      setTestSessionError(null)

      const response = await fetch("/api/debug/create-test-session", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Er is een fout opgetreden bij het aanmaken van een test sessie")
      }

      setTestSessionId(data.sessionId)
    } catch (err: any) {
      setTestSessionError(err.message || "Er is een fout opgetreden")
    } finally {
      setTestSessionCreating(false)
    }
  }

  const redirectToStripe = async () => {
    if (!testSessionId || !stripeLoaded || !stripeKey) return

    try {
      const stripe = await loadStripe(stripeKey)
      if (!stripe) {
        throw new Error("Stripe kon niet worden geladen")
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: testSessionId,
      })

      if (error) {
        throw error
      }
    } catch (err: any) {
      setTestSessionError(err.message || "Er is een fout opgetreden bij het redirecten naar Stripe")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Configuratie</CardTitle>
          <CardDescription>Informatie over de Stripe configuratie</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              <span>Stripe configuratie controleren...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="font-semibold">Stripe Publishable Key:</span>
                {stripeKey ? (
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {stripeKey.substring(0, 8)}...{stripeKey.substring(stripeKey.length - 4)}
                  </span>
                ) : (
                  <span className="text-red-500">Niet geconfigureerd</span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-semibold">Stripe geladen:</span>
                {stripeLoaded === true ? (
                  <span className="text-green-500 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" /> Succesvol geladen
                  </span>
                ) : stripeLoaded === false ? (
                  <span className="text-red-500 flex items-center">
                    <XCircle className="h-4 w-4 mr-1" /> Niet geladen
                  </span>
                ) : (
                  <span className="text-gray-500">Onbekend</span>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Fout</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => window.location.reload()} variant="outline">
            Vernieuwen
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Stripe Checkout</CardTitle>
          <CardDescription>Maak een test checkout sessie aan om de Stripe integratie te testen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testSessionId ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Test sessie aangemaakt</AlertTitle>
                <AlertDescription>
                  Sessie ID: <code className="bg-gray-100 px-1 py-0.5 rounded">{testSessionId}</code>
                </AlertDescription>
              </Alert>
            ) : (
              <p>Klik op de knop om een test checkout sessie aan te maken.</p>
            )}

            {testSessionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fout</AlertTitle>
                <AlertDescription>{testSessionError}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={createTestSession} disabled={testSessionCreating || !!testSessionId}>
            {testSessionCreating ? "Bezig..." : "Maak test sessie"}
          </Button>
          {testSessionId && (
            <Button onClick={redirectToStripe} disabled={!stripeLoaded}>
              Ga naar Stripe Checkout
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
