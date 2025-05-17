import { type NextRequest, NextResponse } from "next/server"
// Vervang de import van stripe
import { stripe } from "@/lib/stripe-server"
import { trackEnrollment } from "@/lib/enrollment-tracker"
import { createCourseEnrollment, getContactEnrollments } from "@/lib/enrollment"
import { getProductById } from "@/lib/products"
import { upsertClickFunnelsContact } from "@/lib/clickfunnels"

// Constanten voor betere leesbaarheid en onderhoud
const MAX_ENROLLMENT_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000
const WEBHOOK_TIMEOUT_MS = 10000 // 10 seconden timeout voor de hele webhook verwerking

// Verbeterde functie voor het inschrijven van gebruikers via webhook
async function enrollUserInCoursesWebhook(
  contactId: number,
  courseIds: string[],
  sessionId: string,
): Promise<{
  success: boolean
  enrolledCourses: string[]
  alreadyEnrolledCourses: string[]
  failedCourses: string[]
}> {
  const enrolledCourses: string[] = []
  const alreadyEnrolledCourses: string[] = []
  const failedCourses: string[] = []

  if (!courseIds || courseIds.length === 0) {
    console.log("No courses to enroll in via webhook")
    return { success: true, enrolledCourses, alreadyEnrolledCourses, failedCourses }
  }

  console.log(`Webhook enrolling contact ${contactId} in ${courseIds.length} courses...`)

  // Gebruik Promise.all voor parallelle verwerking van voorcontroles
  const enrollmentChecks = await Promise.all(
    courseIds.map(async (courseId) => {
      try {
        // Controleer eerst of de gebruiker al is ingeschreven voor deze cursus
        const existingEnrollments = await getContactEnrollments(contactId, courseId)
        const isAlreadyEnrolled =
          existingEnrollments.success && existingEnrollments.data && existingEnrollments.data.length > 0

        // Controleer of deze inschrijving al is verwerkt
        const canTrackEnrollment = await trackEnrollment(sessionId, contactId, courseId)

        return {
          courseId,
          isAlreadyEnrolled,
          canTrackEnrollment,
        }
      } catch (error) {
        console.error(`Error checking enrollment for course ${courseId}:`, error)
        return {
          courseId,
          isAlreadyEnrolled: false,
          canTrackEnrollment: false,
          error,
        }
      }
    }),
  )

  // Verwerk de resultaten van de voorcontroles
  for (const check of enrollmentChecks) {
    const { courseId, isAlreadyEnrolled, canTrackEnrollment, error } = check

    if (error) {
      console.error(`Error in pre-check for course ${courseId}:`, error)
      failedCourses.push(courseId)
      continue
    }

    if (isAlreadyEnrolled) {
      console.log(`Contact ${contactId} is already enrolled in course ${courseId}. Skipping webhook enrollment.`)
      alreadyEnrolledCourses.push(courseId)
      continue
    }

    if (!canTrackEnrollment) {
      console.log(
        `Enrollment for session ${sessionId} and course ${courseId} already processed or will be handled by success page. Skipping webhook enrollment.`,
      )
      continue
    }

    // Probeer de inschrijving te maken
    console.log(`Creating new enrollment via webhook for contact ${contactId} in course ${courseId}...`)

    let enrollmentSuccess = false
    let attempts = 0

    while (!enrollmentSuccess && attempts < MAX_ENROLLMENT_ATTEMPTS) {
      attempts++
      console.log(`Webhook enrollment attempt ${attempts} of ${MAX_ENROLLMENT_ATTEMPTS} for course ${courseId}`)

      try {
        const enrollmentResult = await createCourseEnrollment({
          contact_id: contactId,
          course_id: courseId,
          origination_source_type: "stripe_webhook",
          origination_source_id: 1,
        })

        console.log(`Webhook attempt ${attempts} result for course ${courseId}:`, enrollmentResult)

        if (enrollmentResult.success) {
          if (enrollmentResult.alreadyEnrolled) {
            enrollmentSuccess = true
            console.log(`Contact ${contactId} is already enrolled in course ${courseId} (webhook check)`)
            alreadyEnrolledCourses.push(courseId)
          } else {
            enrollmentSuccess = true
            console.log(`Successfully enrolled contact in course ${courseId} via webhook on attempt ${attempts}`)
            enrolledCourses.push(courseId)
          }
          break
        } else {
          console.error(
            `Failed to enroll contact in course ${courseId} via webhook on attempt ${attempts}:`,
            enrollmentResult.error,
          )
          // Wacht voor de volgende poging
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        }
      } catch (enrollError) {
        console.error(`Error during webhook enrollment attempt ${attempts} for course ${courseId}:`, enrollError)
        // Wacht voor de volgende poging
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }

    if (!enrollmentSuccess) {
      console.error(`All ${MAX_ENROLLMENT_ATTEMPTS} webhook enrollment attempts failed for course ${courseId}`)
      failedCourses.push(courseId)
    }
  }

  return {
    success: failedCourses.length === 0,
    enrolledCourses,
    alreadyEnrolledCourses,
    failedCourses,
  }
}

export async function POST(req: NextRequest) {
  // Performance meting starten
  const startTime = performance.now()

  // Implementeer een timeout voor de hele webhook verwerking
  let timeoutId: NodeJS.Timeout | null = null
  const timeoutPromise = new Promise<NextResponse>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.error("⚠️ Webhook processing timed out after", WEBHOOK_TIMEOUT_MS, "ms")
      reject(new Error("Webhook processing timed out"))
    }, WEBHOOK_TIMEOUT_MS)
  })

  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature") as string

    // Vroege validatie van de signature header
    if (!signature) {
      console.error("⚠️ Missing Stripe signature header")
      return new NextResponse("Webhook Error: Missing signature header", { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed.`, err.message)
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
    }

    // Alleen verwerk de events die we nodig hebben
    if (
      event.type !== "checkout.session.completed" &&
      event.type !== "payment_intent.succeeded" &&
      event.type !== "invoice.paid"
    ) {
      console.log(`Skipping webhook event type: ${event.type}`)
      return new NextResponse(JSON.stringify({ received: true, eventType: event.type }))
    }

    // Handle the event
    const processingPromise = (async () => {
      // Verschillende event types verwerken
      if (event.type === "checkout.session.completed") {
        const session = event.data.object

        // Extract metadata
        const { metadata } = session
        const {
          email,
          first_name,
          last_name,
          phone,
          birth_date,
          product_id,
          product_name,
          course_id,
          enrollment_handled_by,
          clickfunnels_course_ids: courseIdsJson,
        } = metadata || {}

        // Get customer email from session or metadata
        const customerEmail = session.customer_email || email

        console.log(`Webhook received for completed checkout session: ${session.id}`)
        console.log(`Customer email: ${customerEmail}`)

        // Controleer of we de inschrijving moeten verwerken
        if (enrollment_handled_by === "success_page") {
          console.log(
            `Enrollment for session ${session.id} is handled by the success page. Skipping webhook enrollment.`,
          )

          // Performance meting eindigen
          const endTime = performance.now()
          console.log(`Webhook processed in ${Math.round(endTime - startTime)}ms (skipped enrollment)`)

          return new NextResponse(JSON.stringify({ received: true, skipped: true }))
        }

        // Alleen verwerk als we een e-mailadres hebben
        if (!customerEmail) {
          console.error("No customer email found in session or metadata")
          return new NextResponse(JSON.stringify({ received: true, error: "Missing customer email" }), { status: 400 })
        }

        // Maak of update het contact in ClickFunnels
        const contactResult = await upsertClickFunnelsContact({
          email: customerEmail,
          first_name: first_name,
          last_name: last_name,
          // Explicitly omit phone to prevent the "Phone number has already been taken" error
          tags: ["stripe-customer", "webhook-processed"],
          custom_fields: {
            product_id: product_id || "",
            product_name: product_name || "",
            payment_date: new Date().toISOString(),
            payment_method: "Stripe",
            stripe_session_id: session.id,
            stripe_customer_id: session.customer || "",
            birth_date: birth_date || "",
            source: "webhook",
          },
        })

        if (!contactResult.success || !contactResult.contactId) {
          console.error("Failed to create/update contact via webhook:", contactResult.error)
          return new NextResponse(
            JSON.stringify({
              received: true,
              error: "Failed to create/update contact",
            }),
            { status: 500 },
          )
        }

        console.log(`Contact created/updated via webhook with ID: ${contactResult.contactId}`)

        // Haal het product op om de cursus IDs te krijgen
        const productId = product_id
        const courseId = course_id
        const product = productId ? getProductById(productId as string) : undefined
        let courseIds = product?.metadata?.clickfunnels_course_ids || []

        // Probeer courseIds uit JSON te parsen als het beschikbaar is
        if (courseIdsJson) {
          try {
            const parsedCourseIds = JSON.parse(courseIdsJson as string)
            if (Array.isArray(parsedCourseIds)) {
              courseIds = parsedCourseIds
            }
          } catch (e) {
            console.error("Error parsing course IDs from JSON:", e)
          }
        }

        // Voor backward compatibility, voeg het oude courseId toe als het niet al in de lijst staat
        if (courseId && !courseIds.includes(courseId as string)) {
          courseIds.push(courseId as string)
        }

        console.log("Course IDs for webhook enrollment:", courseIds)

        // Als er course IDs zijn en een contact ID, schrijf de klant in voor de cursussen
        if (courseIds.length > 0 && contactResult.contactId) {
          console.log(`Webhook enrolling contact ${contactResult.contactId} in ${courseIds.length} courses...`)

          const enrollmentResult = await enrollUserInCoursesWebhook(contactResult.contactId, courseIds, session.id)

          if (enrollmentResult.enrolledCourses.length > 0) {
            console.log(`Successfully enrolled in courses via webhook: ${enrollmentResult.enrolledCourses.join(", ")}`)
          }

          if (enrollmentResult.alreadyEnrolledCourses.length > 0) {
            console.log(`User was already enrolled in courses: ${enrollmentResult.alreadyEnrolledCourses.join(", ")}`)
          }

          if (enrollmentResult.failedCourses.length > 0) {
            console.warn(`Failed to enroll in some courses via webhook: ${enrollmentResult.failedCourses.join(", ")}`)
          }

          // Performance meting eindigen
          const endTime = performance.now()
          console.log(
            `Webhook processed in ${Math.round(endTime - startTime)}ms with ${enrollmentResult.enrolledCourses.length} enrollments`,
          )

          return new NextResponse(
            JSON.stringify({
              received: true,
              enrolled: enrollmentResult.enrolledCourses.length,
              alreadyEnrolled: enrollmentResult.alreadyEnrolledCourses.length,
              failed: enrollmentResult.failedCourses.length,
            }),
          )
        } else {
          console.log(`No courses to enroll in or missing contact ID`)

          // Performance meting eindigen
          const endTime = performance.now()
          console.log(`Webhook processed in ${Math.round(endTime - startTime)}ms (no enrollments)`)

          return new NextResponse(JSON.stringify({ received: true, noCourses: true }))
        }
      } else if (event.type === "payment_intent.succeeded") {
        // Verwerk payment_intent.succeeded events
        const paymentIntent = event.data.object
        console.log(`Payment intent succeeded: ${paymentIntent.id}`)

        // Performance meting eindigen
        const endTime = performance.now()
        console.log(`Webhook processed in ${Math.round(endTime - startTime)}ms (payment intent)`)

        return new NextResponse(
          JSON.stringify({
            received: true,
            eventType: "payment_intent.succeeded",
            paymentIntentId: paymentIntent.id,
          }),
        )
      } else if (event.type === "invoice.paid") {
        // Verwerk invoice.paid events
        const invoice = event.data.object
        console.log(`Invoice paid: ${invoice.id}`)

        // Performance meting eindigen
        const endTime = performance.now()
        console.log(`Webhook processed in ${Math.round(endTime - startTime)}ms (invoice paid)`)

        return new NextResponse(
          JSON.stringify({
            received: true,
            eventType: "invoice.paid",
            invoiceId: invoice.id,
          }),
        )
      } else {
        console.log(`Unhandled event type: ${event.type}`)
        return new NextResponse(JSON.stringify({ received: true, eventType: event.type }))
      }
    })()

    // Race tussen de verwerking en de timeout
    const response = await Promise.race([processingPromise, timeoutPromise])

    // Clear the timeout if processing completed successfully
    if (timeoutId) clearTimeout(timeoutId)

    return response
  } catch (error) {
    // Clear the timeout if there was an error
    if (timeoutId) clearTimeout(timeoutId)

    console.error("Error processing webhook:", error)

    // Specifieke foutafhandeling voor timeout
    if (error instanceof Error && error.message === "Webhook processing timed out") {
      return new NextResponse(
        JSON.stringify({
          received: true,
          error: "Webhook processing timed out",
          message:
            "The webhook was received but processing took too long. The operation may still complete in the background.",
        }),
        { status: 202 }, // 202 Accepted - we hebben het ontvangen maar niet volledig verwerkt
      )
    }

    return new NextResponse(JSON.stringify({ received: true, error: "Internal server error" }), { status: 500 })
  }
}
