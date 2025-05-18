import { NextResponse } from "next/server"
import { getCoursesForProduct } from "@/lib/collections"
import { CLICKFUNNELS_API_TOKEN, CLICKFUNNELS_SUBDOMAIN, CLICKFUNNELS_WORKSPACE_ID } from "@/lib/config"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Controleer eerst of de ClickFunnels configuratie aanwezig is
    if (!CLICKFUNNELS_API_TOKEN || !CLICKFUNNELS_SUBDOMAIN || !CLICKFUNNELS_WORKSPACE_ID) {
      console.error("ClickFunnels configuratie ontbreekt")
      return NextResponse.json(
        {
          error: "ClickFunnels configuratie ontbreekt",
          details: "Controleer of de environment variables correct zijn ingesteld",
          configError: true,
        },
        { status: 500 },
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Product ID is vereist" }, { status: 400 })
    }

    console.log(`API route: Fetching courses for product ID: ${id}`)

    try {
      // Fetch courses for this product
      const courses = await getCoursesForProduct(id)
      console.log(`API route: Found ${courses.length} courses for product ${id}`)
      return NextResponse.json({ courses })
    } catch (courseError) {
      console.error(`Error in getCoursesForProduct:`, courseError)

      // Geef meer gedetailleerde foutinformatie terug
      const errorMessage = courseError instanceof Error ? courseError.message : String(courseError)
      const errorStack = courseError instanceof Error ? courseError.stack : undefined

      return NextResponse.json(
        {
          error: "Fout bij het ophalen van cursussen",
          details: errorMessage,
          stack: errorStack,
          technicalError: true,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error(`Error in /api/admin/products/${params.id}/courses:`, error)

    // Geef meer gedetailleerde foutinformatie terug
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    return NextResponse.json(
      {
        error: "Onverwachte fout bij het ophalen van cursussen",
        details: errorMessage,
        stack: errorStack,
        technicalError: true,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
