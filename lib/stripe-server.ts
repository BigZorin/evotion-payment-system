import Stripe from "stripe"

// Controleer of de STRIPE_SECRET_KEY is ingesteld
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is niet ingesteld in de omgevingsvariabelen")
  throw new Error("STRIPE_SECRET_KEY is niet ingesteld")
}

// Initialiseer de Stripe client met de API key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16", // Gebruik de meest recente API versie
  appInfo: {
    name: "Evotion Coaching Betaalplatform",
    version: "1.0.0",
  },
})
