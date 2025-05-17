import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function FallbackCheckoutPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Betaling niet mogelijk</CardTitle>
          <CardDescription>Er is een probleem met de betalingsverwerker</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fout</AlertTitle>
            <AlertDescription>
              De betalingsverwerker (Stripe) is momenteel niet beschikbaar of niet correct geconfigureerd.
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground mb-4">
            Probeer het later opnieuw of neem contact op met de klantenservice als het probleem aanhoudt.
          </p>

          <p className="text-sm font-medium">Foutdetails:</p>
          <p className="text-xs text-muted-foreground">
            Stripe API key is niet correct geconfigureerd. Neem contact op met de beheerder.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar de homepage
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
