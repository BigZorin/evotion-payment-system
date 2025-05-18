import { NextResponse } from "next/server"
import { apiCache } from "@/lib/cache"

export const dynamic = "force-dynamic" // Zorg ervoor dat deze route altijd dynamisch is

export async function GET(request: Request) {
  try {
    // Haal cache statistieken op
    const stats = apiCache.getStats()

    return NextResponse.json({
      status: "success",
      cache: stats,
    })
  } catch (error) {
    console.error("Error getting cache stats:", error)
    return NextResponse.json({ error: "Failed to get cache stats", message: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const type = url.searchParams.get("type")

    if (type) {
      // Invalideer alleen een specifiek type
      apiCache.invalidateType(type)
      return NextResponse.json({
        status: "success",
        message: `Cache voor type '${type}' is geleegd`,
      })
    } else {
      // Leeg de hele cache
      apiCache.clear()
      return NextResponse.json({
        status: "success",
        message: "Volledige cache is geleegd",
      })
    }
  } catch (error) {
    console.error("Error clearing cache:", error)
    return NextResponse.json({ error: "Failed to clear cache", message: error.message }, { status: 500 })
  }
}
