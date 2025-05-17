"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface PaymentStatusProps {
  sessionId: string
  onSuccess?: () => void
  onError?: () => void
}

export function PaymentStatus({ sessionId, onSuccess, onError }: PaymentStatusProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "pending">("loading")
  const [message, setMessage] = useState<string>("")
  const [retryCount, setRetryCount] = useState(0)
  const [isPolling, setIsPolling] = useState(true)

  useEffect(() => {
    if (!sessionId) return

    const checkStatus = async () => {
      try {
        const response = await fetch("/api/payment-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        })

        if (!response.ok) {
          throw new Error("Fout bij het ophalen van de betalingsstatus")
        }

        const data = await response.json()

        if (data.status === "paid") {
          setStatus("success")
          setMessage("Betaling is succesvol verwerkt!")
          setIsPolling(false)
          onSuccess?.()
        } else if (data.status === "unpaid" || data.status === "incomplete") {
          setStatus("pending")
          setMessage("Betaling is nog niet voltooid. We controleren de status opnieuw over enkele seconden.")
        } else {
          setStatus("error")
          setMessage(`Betaling is niet gelukt: ${data.status}`)
          setIsPolling(false)
          onError?.()
        }
      } catch (error) {
        console.error("Error checking payment status:", error)
        setRetryCount((prev) => prev + 1)

        if (retryCount >= 3) {
          setStatus("error")
          setMessage("Er is een fout opgetreden bij het controleren van de betalingsstatus.")
          setIsPolling(false)
          onError?.()
        }
      }
    }

    checkStatus()

    // Stel een interval in om de status periodiek te controleren
    const interval = isPolling ? setInterval(checkStatus, 5000) : null

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [sessionId, isPolling, retryCount, onSuccess, onError])

  const handleRetry = () => {
    setStatus("loading")
    setRetryCount(0)
    setIsPolling(true)
  }

  return (
    <div className="my-6">
      {status === "loading" && (
        <Alert className="bg-blue-50 border-blue-200">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Betalingsstatus controleren</AlertTitle>
          <AlertDescription className="text-blue-700">
            We controleren de status van je betaling. Dit kan enkele momenten duren...
          </AlertDescription>
        </Alert>
      )}

      {status === "success" && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Betaling geslaagd</AlertTitle>
          <AlertDescription className="text-green-700">{message}</AlertDescription>
        </Alert>
      )}

      {status === "pending" && (
        <Alert className="bg-amber-50 border-amber-200">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Betaling in behandeling</AlertTitle>
          <AlertDescription className="text-amber-700">{message}</AlertDescription>
        </Alert>
      )}

      {status === "error" && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Fout bij betaling</AlertTitle>
          <AlertDescription className="text-red-700">
            {message}
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={handleRetry}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                Probeer opnieuw
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
