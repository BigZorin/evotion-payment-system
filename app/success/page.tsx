import { redirect } from "next/navigation"
import { handleSuccessfulPayment } from "@/lib/actions"
import { CheckCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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

  const { success, customerEmail, error } = await handleSuccessfulPayment(sessionId)

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
      {success ? (
        <>
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4">Bedankt voor je bestelling!</h1>

          <p className="text-lg mb-8">
            We hebben je betaling ontvangen en een bevestiging is verzonden naar {customerEmail}. Je account is
            succesvol aangemaakt in ClickFunnels.
          </p>

          <div className="space-y-4">
            <p>Je kunt nu inloggen op het ClickFunnels platform om toegang te krijgen tot je gekochte diensten.</p>

            <div className="flex justify-center">
              <Link href="https://app.clickfunnels.com/login">
                <Button>Inloggen bij ClickFunnels</Button>
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-4">Er is iets misgegaan</h1>
          <p className="text-lg mb-8">
            {error || "We konden je betaling niet verwerken. Neem contact op met onze klantenservice."}
          </p>
          <Link href="/">
            <Button>Terug naar home</Button>
          </Link>
        </>
      )}
    </div>
  )
}
