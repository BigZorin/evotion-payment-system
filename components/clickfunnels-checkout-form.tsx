"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface ClickFunnelsCheckoutFormProps {
  product?: any
  productId?: string
  isSubscription?: boolean
}

export function ClickFunnelsCheckoutForm({
  product,
  productId,
  isSubscription = false,
}: ClickFunnelsCheckoutFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCompany, setIsCompany] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    customerEmail: "",
    customerFirstName: "",
    customerLastName: "",
    customerPhone: "",
    customerBirthDate: "",
    companyDetails: {
      name: "",
      vatNumber: "",
      address: "",
      postalCode: "",
      city: "",
    },
  })

  // Bepaal het product ID
  const effectiveProductId = productId || (product && (product.public_id || product.id))

  if (!effectiveProductId && !product) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Er is een fout opgetreden bij het laden van het product. Probeer de pagina te vernieuwen.
        </AlertDescription>
      </Alert>
    )
  }

  // Bepaal de prijs om weer te geven
  let priceDisplay = "Prijs niet beschikbaar"
  if (product) {
    if (product.defaultPrice) {
      priceDisplay = formatCurrency(product.defaultPrice.amount)
    } else if (product.prices && product.prices.length > 0) {
      priceDisplay = formatCurrency(product.prices[0].amount)
    } else if (
      product.variants &&
      product.variants.length > 0 &&
      product.variants[0].prices &&
      product.variants[0].prices.length > 0
    ) {
      priceDisplay = formatCurrency(product.variants[0].prices[0].amount)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name.startsWith("company.")) {
      const companyField = name.split(".")[1]
      setFormData({
        ...formData,
        companyDetails: {
          ...formData.companyDetails,
          [companyField]: value,
        },
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Valideer de verplichte velden
      if (!formData.customerEmail || !formData.customerFirstName || !formData.customerLastName) {
        throw new Error("Vul alle verplichte velden in")
      }

      // Valideer e-mailadres
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.customerEmail)) {
        throw new Error("Vul een geldig e-mailadres in")
      }

      // Valideer bedrijfsgegevens als het een bedrijf is
      if (isCompany && !formData.companyDetails.name) {
        throw new Error("Vul de bedrijfsnaam in")
      }

      // Bereid de data voor
      const checkoutData = {
        productId: effectiveProductId,
        customerEmail: formData.customerEmail,
        customerFirstName: formData.customerFirstName,
        customerLastName: formData.customerLastName,
        customerPhone: formData.customerPhone || undefined,
        customerBirthDate: formData.customerBirthDate || undefined,
        companyDetails: isCompany ? formData.companyDetails : undefined,
      }

      console.log("Sending checkout data:", checkoutData)

      // Stuur de data naar de API
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(checkoutData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Er is een fout opgetreden bij het verwerken van je betaling")
      }

      // Redirect naar Stripe Checkout
      if (data.sessionId) {
        const stripe = (window as any).Stripe?.(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
        if (stripe) {
          await stripe.redirectToCheckout({
            sessionId: data.sessionId,
          })
        } else {
          router.push(`/checkout/redirect?session_id=${data.sessionId}`)
        }
      } else {
        throw new Error("Geen sessie ID ontvangen van de server")
      }
    } catch (err: any) {
      console.error("Checkout error:", err)
      setError(err.message || "Er is een fout opgetreden. Probeer het later opnieuw.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerFirstName">Voornaam *</Label>
            <Input
              id="customerFirstName"
              name="customerFirstName"
              value={formData.customerFirstName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerLastName">Achternaam *</Label>
            <Input
              id="customerLastName"
              name="customerLastName"
              value={formData.customerLastName}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerEmail">E-mailadres *</Label>
          <Input
            id="customerEmail"
            name="customerEmail"
            type="email"
            value={formData.customerEmail}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerPhone">Telefoonnummer</Label>
          <Input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            value={formData.customerPhone}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerBirthDate">Geboortedatum</Label>
          <Input
            id="customerBirthDate"
            name="customerBirthDate"
            type="date"
            value={formData.customerBirthDate}
            onChange={handleInputChange}
          />
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox id="isCompany" checked={isCompany} onCheckedChange={(checked) => setIsCompany(!!checked)} />
          <Label htmlFor="isCompany" className="text-sm font-normal cursor-pointer">
            Ik wil factureren op bedrijfsnaam
          </Label>
        </div>

        {isCompany && (
          <div className="space-y-4 pt-2 border-t border-gray-200">
            <div className="space-y-2">
              <Label htmlFor="company.name">Bedrijfsnaam *</Label>
              <Input
                id="company.name"
                name="company.name"
                value={formData.companyDetails.name}
                onChange={handleInputChange}
                required={isCompany}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company.vatNumber">BTW-nummer</Label>
              <Input
                id="company.vatNumber"
                name="company.vatNumber"
                value={formData.companyDetails.vatNumber}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company.address">Adres</Label>
                <Input
                  id="company.address"
                  name="company.address"
                  value={formData.companyDetails.address}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company.postalCode">Postcode</Label>
                <Input
                  id="company.postalCode"
                  name="company.postalCode"
                  value={formData.companyDetails.postalCode}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company.city">Plaats</Label>
              <Input
                id="company.city"
                name="company.city"
                value={formData.companyDetails.city}
                onChange={handleInputChange}
              />
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <span className="font-medium">Totaal:</span>
          <span className="text-xl font-bold">{priceDisplay}</span>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bezig met verwerken...
            </>
          ) : isSubscription ? (
            "Start abonnement"
          ) : (
            "Nu betalen"
          )}
        </Button>
      </div>
    </form>
  )
}
