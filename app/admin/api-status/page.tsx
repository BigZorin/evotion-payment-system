import { checkAllApiStatus } from "@/lib/api-status"
import ApiStatusDashboard from "@/components/api-status-dashboard"

export const metadata = {
  title: "API Status Dashboard",
  description: "Monitor de status van alle API-verbindingen",
}

export default async function ApiStatusPage() {
  // Haal initiële data op voor SSR
  const results = await checkAllApiStatus()

  // Bereken statistieken
  const summary = calculateSummary(results)

  return (
    <div className="p-8 md:ml-6">
      <ApiStatusDashboard initialData={{ results, summary }} />
    </div>
  )
}

// Helper functie om statistieken te berekenen (duplicaat van route.ts, maar nodig voor SSR)
function calculateSummary(results: any[]) {
  const total = results.length
  const online = results.filter((r) => r.status === "online").length
  const offline = results.filter((r) => r.status === "offline").length
  const degraded = results.filter((r) => r.status === "degraded").length
  const unknown = results.filter((r) => r.status === "unknown").length

  // Bereken gemiddelde responstijd
  const totalResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0)
  const averageResponseTime = total > 0 ? Math.round(totalResponseTime / total) : 0

  // Bereken statistieken per categorie
  const categories = [...new Set(results.map((r) => r.endpoint.category))].map((category) => {
    const categoryResults = results.filter((r) => r.endpoint.category === category)
    return {
      name: category,
      total: categoryResults.length,
      online: categoryResults.filter((r) => r.status === "online").length,
      offline: categoryResults.filter((r) => r.status === "offline").length,
      degraded: categoryResults.filter((r) => r.status === "degraded").length,
    }
  })

  return {
    total,
    online,
    offline,
    degraded,
    unknown,
    averageResponseTime,
    categories,
  }
}
