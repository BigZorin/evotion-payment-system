"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"

export default function SubscriptionsPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  // Haal de email uit localStorage als die er is
  useEffect(() => {
    const storedEmail = localStorage.getItem("userEmail")
    if (storedEmail) {
      setEmail(storedEmail)
      fetchSubscriptions(storedEmail)
    }
  }, [])

  const fetchSubscriptions = async (emailToUse: string) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/subscriptions/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailToUse }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Er is een fout opgetreden")
      }

      setSubscriptions(data.subscriptions)
      setSubmitted(true)

      // Sla de email op in localStorage
      localStorage.setItem("userEmail", emailToUse)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSubscriptions(email)
  }

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Er is een fout opgetreden bij het opzeggen van het abonnement")
      }

      // Ververs de abonnementen
      fetchSubscriptions(email)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Mijn abonnementen</h1>

      {!submitted && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Vul je e-mailadres in</CardTitle>
            <CardDescription>
              Vul het e-mailadres in dat je hebt gebruikt bij het aanmaken van je abonnement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="E-mailadres"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Laden..." : "Abonnementen bekijken"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading ? (
        <SubscriptionsLoading />
      ) : (
        <>
          {submitted && subscriptions.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Geen abonnementen gevonden</CardTitle>
                <CardDescription>We konden geen abonnementen vinden voor dit e-mailadres.</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Ander e-mailadres proberen
                </Button>
              </CardFooter>
            </Card>
          )}

          {subscriptions.length > 0 && (
            <div className="space-y-6">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id}>
                  <CardHeader>
                    <CardTitle>{subscription.productName}</CardTitle>
                    <CardDescription>
                      <span className={subscription.statusColor}>{subscription.status}</span> • Abonnement ID:{" "}
                      {subscription.id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Prijs:</span>
                        <span>
                          {subscription.amount} {subscription.intervalText}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Volgende factuurdatum:</span>
                        <span>{subscription.nextBillingDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Betaalmethode:</span>
                        <span>{subscription.paymentMethod}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {subscription.isActive && (
                      <Button variant="outline" onClick={() => handleCancelSubscription(subscription.id)}>
                        Abonnement opzeggen
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SubscriptionsLoading() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
