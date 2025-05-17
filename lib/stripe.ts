// Dit bestand is nu alleen voor compatibiliteit met bestaande imports
// Nieuwe code zou direct stripe-server.ts of stripe-client.ts moeten importeren

// Re-export de client-side configuratie
export { STRIPE_PUBLISHABLE_KEY } from "./stripe-client"

// Server-side import met dynamische import om client-side errors te voorkomen
export const stripe = process.env.STRIPE_SECRET_KEY
  ? (async () => {
      // Dit wordt alleen uitgevoerd op de server
      if (typeof window === "undefined") {
        const { stripe } = await import("./stripe-server")
        return stripe
      }
      return null
    })()
  : null
