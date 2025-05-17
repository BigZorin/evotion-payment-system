"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe"

// Formulier schema
const formSchema = z.object({
  customerEmail: z.string().email({ message: "Voer een geldig e-mailadres in" }),
  customerFirstName: z.string().min(1, { message: "Voornaam is verplicht" }),
  customerLastName: z.string().min(1, { message: "Achternaam is verplicht" }),
  customerPhone: z.string().optional(),
  customerBirthDate: z.string().optional(),
  isCompany: z.boolean().default(false),
  companyDetails: z
    .object({
      name: z.string().min(1, { message: "Bedrijfsnaam is verplicht" }),
      vatNumber: z.string().optional(),
      address: z.string().optional(),
      postalCode: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Je moet akkoord gaan met de algemene voorwaarden",
  }),
})

type FormValues = z.infer<typeof formSchema>

interface CheckoutFormProps {
  productId: string
  productName?: string
  productDescription?: string
  productPrice?: number
}

export function ClickFunnelsCheckoutForm({
  productId,
  productName = "Product",
  productDescription = "Beschrijving",
  productPrice,
}: CheckoutFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [stripeLoaded, setStripeLoaded] = useState(false)

  // Controleer of Stripe correct is geconfigureerd
  useEffect(() => {
    const checkStripeConfig = async () => {
      try {
        if (!STRIPE_PUBLISHABLE_KEY) {
          console.error("STRIPE_PUBLISHABLE_KEY is niet geconfigureerd")
          setStripeError("Stripe is niet correct geconfigureerd. Neem contact op met de beheerder.")
          return false
        }

        // Probeer Stripe te laden
        const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
        const stripe = await stripePromise

        if (!stripe) {
          console.error("Stripe kon niet worden geladen")
          setStripeError("Stripe kon niet worden geladen. Controleer je internetverbinding.")
          return false
        }

        setStripeLoaded(true)
        return true
      } catch (error) {
        console.error("Fout bij het laden van Stripe:", error)
        setStripeError("Er is een fout opgetreden bij het laden van Stripe.")
        return false
      }
    }

    checkStripeConfig()
  }, [])

  // Formulier initialisatie
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerEmail: "",
      customerFirstName: "",
      customerLastName: "",
      customerPhone: "",
      customerBirthDate: "",
      isCompany: false,
      companyDetails: {
        name: "",
        vatNumber: "",
        address: "",
        postalCode: "",
        city: "",
      },
      acceptTerms: false,
    },
  })

  // Formulier verzenden
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Controleer of Stripe correct is geladen
      if (!stripeLoaded) {
        setError("Stripe is niet correct geladen. Vernieuw de pagina of probeer het later opnieuw.")
        setIsSubmitting(false)
        return
      }

      // Bereid de checkout data voor
      const checkoutData = {
        productId,
        customerEmail: data.customerEmail,
        customerFirstName: data.customerFirstName,
        customerLastName: data.customerLastName,
        customerPhone: data.customerPhone || undefined,
        customerBirthDate: data.customerBirthDate || undefined,
        companyDetails: data.isCompany ? data.companyDetails : undefined,
      }

      // Stuur de checkout data naar de API
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(checkoutData),
      })

      // Verwerk de API response
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Er is een fout opgetreden bij het verwerken van je betaling")
      }

      // Redirect naar Stripe Checkout
      if (result.sessionId) {
        // Laad Stripe
        const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY!)

        if (!stripe) {
          throw new Error("Stripe kon niet worden geladen")
        }

        // Redirect naar de Stripe Checkout pagina
        const { error } = await stripe.redirectToCheckout({
          sessionId: result.sessionId,
        })

        if (error) {
          console.error("Stripe redirect error:", error)
          // Als de redirect mislukt, stuur de gebruiker naar de fallback pagina
          router.push(`/checkout/redirect?session_id=${result.sessionId}`)
          return
        }
      } else {
        throw new Error("Geen sessie ID ontvangen van de server")
      }
    } catch (error: any) {
      console.error("Checkout error:", error)
      setError(error.message || "Er is een fout opgetreden bij het verwerken van je betaling")
      setIsSubmitting(false)
    }
  }

  // Toon bedrijfsgegevens als isCompany is aangevinkt
  const watchIsCompany = form.watch("isCompany")

  // Als er een Stripe configuratiefout is, toon een foutmelding
  if (stripeError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Betaling niet mogelijk</CardTitle>
          <CardDescription>Er is een probleem met de betalingsverwerker</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fout</AlertTitle>
            <AlertDescription>{stripeError}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
            Terug naar de homepage
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{productName}</CardTitle>
        <CardDescription>{productDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mailadres</FormLabel>
                    <FormControl>
                      <Input placeholder="jouw@email.nl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voornaam</FormLabel>
                      <FormControl>
                        <Input placeholder="Voornaam" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Achternaam</FormLabel>
                      <FormControl>
                        <Input placeholder="Achternaam" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefoonnummer (optioneel)</FormLabel>
                    <FormControl>
                      <Input placeholder="+31 6 12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isCompany"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Zakelijke aankoop</FormLabel>
                      <FormDescription>Vink aan als je een factuur op bedrijfsnaam wilt ontvangen</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {watchIsCompany && (
                <div className="space-y-4 rounded-md border p-4">
                  <FormField
                    control={form.control}
                    name="companyDetails.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrijfsnaam</FormLabel>
                        <FormControl>
                          <Input placeholder="Bedrijfsnaam" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyDetails.vatNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BTW-nummer (optioneel)</FormLabel>
                        <FormControl>
                          <Input placeholder="NL123456789B01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyDetails.address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adres (optioneel)</FormLabel>
                          <FormControl>
                            <Input placeholder="Straatnaam 123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyDetails.postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postcode (optioneel)</FormLabel>
                          <FormControl>
                            <Input placeholder="1234 AB" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="companyDetails.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plaats (optioneel)</FormLabel>
                        <FormControl>
                          <Input placeholder="Amsterdam" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Ik ga akkoord met de{" "}
                        <a
                          href="https://evotion-coaching.nl/algemene-voorwaarden"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          algemene voorwaarden
                        </a>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fout</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig met verwerken...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {productPrice ? `Betaal €${(productPrice / 100).toFixed(2)}` : "Doorgaan naar betaling"}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
