"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function RecoverEnrollmentPage() {
  const [email, setEmail] = useState("")
  const [courseId, setCourseId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    message?: string
    error?: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/recover-enrollment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, courseId }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "Er is een fout opgetreden bij het herstellen van de inschrijving.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1e1839] text-white">
      {/* Header met logo */}
      <header className="container mx-auto px-4 py-6 border-b border-white/10">
        <div className="flex justify-center md:justify-start">
          <Link href="/">
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

      <main className="container mx-auto px-4 py-12 max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Herstel Cursusinschrijving</h1>
          <p className="text-white/70">Gebruik dit formulier om een cursusinschrijving handmatig te herstellen</p>
        </div>

        <Card className="bg-[#1e1839]/80 border-white/10 shadow-md">
          <CardHeader>
            <CardTitle className="text-white">Inschrijving Herstellen</CardTitle>
            <CardDescription className="text-white/70">
              Voer het e-mailadres van de klant en de cursus ID in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white">
                  E-mailadres <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="klant@voorbeeld.nl"
                  className="bg-[#1e1839]/50 border-white/30 text-white focus:border-white focus:ring-white/30"
                />
              </div>

              <div>
                <Label htmlFor="courseId" className="text-white">
                  Cursus ID <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="courseId"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                  placeholder="bijv. eWbLVk"
                  className="bg-[#1e1839]/50 border-white/30 text-white focus:border-white focus:ring-white/30"
                />
                <p className="text-xs text-white/60 mt-1">Voor 12-Weken Vetverlies Programma, gebruik: eWbLVk</p>
              </div>

              {result && (
                <Alert
                  className={
                    result.success
                      ? "bg-green-900/30 border-green-500/30 text-white"
                      : "bg-red-900/30 border-red-500/30 text-white"
                  }
                >
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}
                  <AlertTitle>{result.success ? "Succes" : "Fout"}</AlertTitle>
                  <AlertDescription>{result.message || result.error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white hover:bg-white/90 text-[#1e1839] transition-colors duration-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bezig met verwerken...
                  </>
                ) : (
                  "Inschrijving Herstellen"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-white/10 pt-4">
            <Link href="/admin/product-courses">
              <Button variant="outline" className="border-white/50 text-white hover:bg-white/10 hover:border-white">
                Bekijk Product-Cursus Toewijzingen
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-12 border-t border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-white/70">© {new Date().getFullYear()} Evotion Coaching. Alle rechten voorbehouden.</p>
          </div>
          <div className="flex space-x-4">
            <Link href="/" className="text-white/70 hover:text-white">
              Terug naar Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
