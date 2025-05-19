import Stripe from "stripe"

// Controleer of de Stripe secret key is geconfigureerd
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is niet geconfigureerd in de omgevingsvariabelen")
}

// Initialiseer Stripe met de secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16", // Gebruik de nieuwste API versie
  appInfo: {
    name: "Evotion Coaching Betaalplatform",
    version: "1.0.0",
  },
})

// Controleer of de verbinding met Stripe werkt
export async function checkStripeConnection() {
  try {
    // Probeer een eenvoudige API call te doen om te controleren of de verbinding werkt
    const balance = await stripe.balance.retrieve()
    return { success: true, message: "Verbinding met Stripe is succesvol" }
  } catch (error: any) {
    console.error("Fout bij het controleren van de Stripe verbinding:", error)
    return { success: false, message: error.message || "Kon geen verbinding maken met Stripe" }
  }
}

// Functie om te controleren of Stripe correct is geconfigureerd
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

// Functie om te controleren of Stripe beschikbaar is
export function isStripeAvailable(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}
