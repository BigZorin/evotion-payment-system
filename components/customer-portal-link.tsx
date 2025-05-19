"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface CustomerPortalLinkProps {
  customerId: string
  className?: string
  children?: React.ReactNode
}

export function CustomerPortalLink({ customerId, className, children }: CustomerPortalLinkProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Er is een fout opgetreden")
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (err: any) {
      console.error("Error redirecting to customer portal:", err)
      setError(err.message || "Er is een fout opgetreden")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button onClick={handleClick} disabled={isLoading} className={className}>
        {isLoading ? "Laden..." : children || "Beheer je abonnement"}
      </Button>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </>
  )
}
