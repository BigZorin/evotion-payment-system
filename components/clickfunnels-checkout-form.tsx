"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { loadStripe } from "@stripe/stripe-js"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutFormProps {
  product: any
  isSubscription?: boolean
}

export function ClickFunnelsCheckoutForm({ product, isSubscription }: CheckoutFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isCompany, setIsCompany] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    birthDate: "",
    companyName: "",
    vatNumber: "",
    address: "",
    postalCode: "",
    city: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log("Submitting form with data:", {
        productId: product.id,
        customerEmail: formData.email,
        customerFirstName: formData.firstName,
        customerLastName: formData.lastName,
        customerPhone: formData.phone,
        customerBirthDate: formData.birthDate,
        companyDetails: isCompany
          ? {
              name: formData.companyName,
              vatNumber: formData.vatNumber,
              address: formData.address,
              postalCode: formData.postalCode,
              city: formData.city,
            }
          : undefined,
      })

      const stripe = await stripePromise
      if (stripe) {
        router.push(
          `/checkout/redirect?${new URLSearchParams({
            productId: product.id,
            customerEmail: formData.email,
            customerFirstName: formData.firstName,
            customerLastName: formData.lastName,
            customerPhone: formData.phone,
            customerBirthDate: formData.birthDate,
            companyName: formData.companyName,
            vatNumber: formData.vatNumber,
            address: formData.address,
            postalCode: formData.postalCode,
            city: formData.city,
            isCompany: String(isCompany),
            isSubscription: String(isSubscription),
          }).toString()}`,
        )
      } else {
        throw new Error("Stripe kon niet worden geladen")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      setError("Er is een fout opgetreden bij het verwerken van je betaling. Probeer het later opnieuw.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-[#1e1839]/10 shadow-md">
      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fout</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-[#1e1839]">
            E-mailadres <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="jouw@email.nl"
            className="bg-white border-[#1e1839]/30 text-[#1e1839] focus:border-[#1e1839] focus:ring-[#1e1839]/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-[#1e1839]">
              Voornaam <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              name="firstName"
              required
              value={formData.firstName}
              onChange={handleChange}
              className="bg-white border-[#1e1839]/30 text-[#1e1839] focus:border-[#1e1839] focus:ring-[#1e1839]/30"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-[#1e1839]">
              Achternaam <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              name="lastName"
              required
              value={formData.lastName}
              onChange={handleChange}
              className="bg-white border-[#1e1839]/30 text-[#1e1839] focus:border-[#1e1839] focus:ring-[#1e1839]/30"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="phone" className="text-[#1e1839]">
            Telefoonnummer
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Bijv. 0612345678"
            className="bg-white border-[#1e1839]/30 text-[#1e1839] focus:border-[#1e1839] focus:ring-[#1e1839]/30"
          />
        </div>

        <div>
          <Label htmlFor="birthDate" className="text-[#1e1839]">
            Geboortedatum
          </Label>
          <Input
            id="birthDate"
            name="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={handleChange}
            className="bg-white border-[#1e1839]/30 text-[#1e1839] focus:border-[#1e1839] focus:ring-[#1e1839]/30"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isCompany"
            checked={isCompany}
            onChange={() => setIsCompany(!isCompany)}
            className="border-[#1e1839]/50 data-[state=checked]:bg-[#1e1839] data-[state=checked]:text-white"
          />
          <Label htmlFor="isCompany" className="text-[#1e1839]">
            Ik betaal namens een bedrijf (factuur op bedrijfsnaam)
          </Label>
        </div>

        {isCompany && (
          <div className="space-y-4 border-t border-[#1e1839]/10 pt-4 mt-4">
            <div>
              <Label htmlFor="companyName" className="text-[#1e1839]">
                Bedrijfsnaam <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                name="companyName"
                required={isCompany}
                value={formData.companyName}
                onChange={handleChange}
                className="bg-white border-[#1e1839]/30 text-[#1e1839] focus:border-[#1e1839] focus:ring-[#1e1839]/30"
              />
            </div>

            <div>
              <Label htmlFor="vatNumber" className="text-[#1e1839]">
                BTW-nummer
              </Label>
              <Input
                id="vatNumber"
                name="vatNumber"
                value={formData.vatNumber}
                onChange={handleChange}
                placeholder="NL123456789B01"
                className="bg-white border-[#1e1839]/30 text-[#1e1839] focus:border-[#1e1839] focus:ring-[#1e1839]/30"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-[#1e1839]">
                Adres <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                name="address"
                required={isCompany}
                value={formData.address}
                onChange={handleChange}
                className="bg-white border-[#1e1839]/30 text-[#1e1839] focus:border-[#1e1839] focus:ring-[#1e1839]/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postalCode" className="text-[#1e1839]">
                  Postcode <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  required={isCompany}
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="bg-white border-[#1e1839]/30 text-[#1e1839] focus:border-[#1e1839] focus:ring-[#1e1839]/30"
                />
              </div>
              <div>
                <Label htmlFor="city" className="text-[#1e1839]">
                  Plaats <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  name="city"
                  required={isCompany}
                  value={formData.city}
                  onChange={handleChange}
                  className="bg-white border-[#1e1839]/30 text-[#1e1839] focus:border-[#1e1839] focus:ring-[#1e1839]/30"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-[#1e1839] hover:bg-white hover:text-[#1e1839] text-white border border-[#1e1839] transition-colors duration-300"
        disabled={isLoading}
      >
        {isLoading ? "Bezig met laden..." : "Doorgaan naar betaling"}
      </Button>

      <div className="text-center text-[#1e1839]/60 text-sm">
        <p>Veilig betalen via Stripe. Je gegevens worden versleuteld verzonden.</p>
        {product.price < 100 && (
          <p className="mt-2 text-amber-600">
            <strong>Test Modus:</strong> Dit is een testbetaling van {(product.price / 100).toFixed(2)} euro.
          </p>
        )}
      </div>
    </form>
  )
}
