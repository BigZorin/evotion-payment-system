import { type NextRequest, NextResponse } from "next/server"
import { upsertClickFunnelsContact, createCourseEnrollment } from "@/lib/clickfunnels"

export async function POST(req: NextRequest) {
  try {
    // In een productieomgeving zou je hier authenticatie en autorisatie moeten toevoegen

    const { email, courseId } = await req.json()

    if (!email || !courseId) {
      return NextResponse.json({ success: false, error: "E-mailadres en cursus ID zijn verplicht" }, { status: 400 })
    }

    // Zoek eerst het contact op basis van e-mailadres
    const upsertResult = await upsertClickFunnelsContact({
      email,
      // We doen geen update, alleen ophalen
    })

    if (!upsertResult.success || !upsertResult.contactId) {
      return NextResponse.json(
        { success: false, error: `Kon geen contact vinden met e-mailadres: ${email}` },
        { status: 404 },
      )
    }

    const contactId = upsertResult.contactId

    // Probeer de inschrijving te maken
    const enrollmentResult = await createCourseEnrollment({
      contact_id: contactId,
      course_id: courseId,
      origination_source_type: "manual_recovery",
      origination_source_id: 1,
    })

    if (enrollmentResult.success) {
      if (enrollmentResult.alreadyEnrolled) {
        return NextResponse.json({
          success: true,
          message: `Contact is al ingeschreven voor cursus ${courseId}`,
        })
      } else {
        return NextResponse.json({
          success: true,
          message: `Inschrijving succesvol hersteld voor contact ID ${contactId} in cursus ${courseId}`,
        })
      }
    } else {
      return NextResponse.json(
        { success: false, error: enrollmentResult.error || "Onbekende fout bij inschrijven" },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Error in recover-enrollment API:", error)
    return NextResponse.json({ success: false, error: error.message || "Er is een fout opgetreden" }, { status: 500 })
  }
}
