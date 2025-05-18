"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  error: Error
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Error caught by error boundary:", error)
  }, [error])

  return (
    <div className="p-4">
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Er is een fout opgetreden</AlertTitle>
        <AlertDescription>{error.message || "Er is een onverwachte fout opgetreden."}</AlertDescription>
      </Alert>
      <Button onClick={reset} variant="outline">
        Probeer opnieuw
      </Button>
    </div>
  )
}
