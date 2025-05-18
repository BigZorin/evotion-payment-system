import Stripe from "stripe"
import { STRIPE_SECRET_KEY } from "./config"

// Controleer of de Stripe API key is geconfigureerd
if (!STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is niet geconfigureerd. Stripe functionaliteit zal niet werken.")
}

// Initialiseer Stripe alleen als de API key beschikbaar is
export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      typescript: true,
    })
  : null

// Helper functie om te controleren of Stripe beschikbaar is
export function isStripeAvailable(): boolean {
  return !!stripe
}
