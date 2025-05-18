/**
 * Client-side Stripe configuratie
 * Dit bestand bevat alleen de publieke Stripe sleutel voor gebruik in de browser
 */

// Exporteer de publieke sleutel voor gebruik in client components
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""

// Controleer of de sleutel is ingesteld en log een waarschuwing als dat niet het geval is
if (!STRIPE_PUBLISHABLE_KEY) {
  console.warn(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is niet ingesteld. Stripe functionaliteit zal niet werken in de browser.",
  )
}

// Exporteer een functie om te controleren of Stripe correct is geconfigureerd
export function isStripeConfigured(): boolean {
  return !!STRIPE_PUBLISHABLE_KEY
}

// Exporteer een functie om de Stripe sleutel veilig te krijgen
export function getStripePublishableKey(): string {
  return STRIPE_PUBLISHABLE_KEY
}
