import Stripe from "stripe"

// Initialiseer Stripe met de API key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16", // Gebruik de meest recente API versie
})
