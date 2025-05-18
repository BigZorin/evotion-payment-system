import { type NextRequest, NextResponse } from "next/server"
import { checkAllApiStatus, checkApiStatusByCategory, checkApiStatus, apiEndpoints } from "@/lib/api-status"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const endpoint = searchParams.get("endpoint")

    let results = []

    if (endpoint) {
      // Test een specifieke endpoint
      const targetEndpoint = apiEndpoints.find((e) => e.url === endpoint)

      if (!targetEndpoint) {
        return NextResponse.json({ error: "Endpoint niet gevonden" }, { status: 404 })
      }

      const result = await checkApiStatus(targetEndpoint)
      results = [result]
    } else if (category) {
      // Haal status op voor een specifieke categorie
      results = await checkApiStatusByCategory(category)
    } else {
      // Haal status op voor alle endpoints
      results = await checkAllApiStatus()
    }

    // Bereken statistieken
    const summary = calculateSummary(results)

    return NextResponse.json({ results, summary })
  } catch (error) {
    console.error("Error in API status route:", error)
    return NextResponse.json({ error: "Er is een fout opgetreden bij het ophalen van de API status" }, { status: 500 })
  }
}

// Helper functie om statistieken te berekenen
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
