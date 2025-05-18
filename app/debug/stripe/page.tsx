import { Suspense } from "react"
import { StripeDebugClient } from "./client"

export default function StripeDebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Stripe Debug Pagina</h1>
      <p className="mb-4">
        Deze pagina toont informatie over de Stripe configuratie en kan helpen bij het oplossen van problemen met
        betalingen.
      </p>

      <Suspense fallback={<div>Laden...</div>}>
        <StripeDebugClient />
      </Suspense>
    </div>
  )
}
