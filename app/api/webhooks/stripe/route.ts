import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { trackEnrollment } from "@/lib/enrollment-tracker"
import { createCourseEnrollment, getContactEnrollments } from "@/lib/enrollment"
import { getProductById } from "@/lib/products"
import { upsertClickFunnelsContact } from "@/lib/clickfunnels"

// Voeg deze functie toe aan de webhook handler
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

  // Process each course enrollment sequentially
  for (const courseId of courseIds) {
    try {
      // Controleer eerst of de gebruiker al is ingeschreven voor deze cursus
      const existingEnrollments = await getContactEnrollments(contactId, courseId)

      if (existingEnrollments.success && existingEnrollments.data && existingEnrollments.data.length > 0) {
        console.log(`Contact ${contactId} is already enrolled in course ${courseId}. Skipping webhook enrollment.`)
        alreadyEnrolledCourses.push(courseId)
        continue
      }

      // Check if this enrollment has already been processed
      if (await trackEnrollment(sessionId, contactId, courseId)) {
        console.log(`Creating new enrollment via webhook for contact ${contactId} in course ${courseId}...`)

        // Try multiple times with different approaches if needed
        let enrollmentSuccess = false
        let attempts = 0
        const maxAttempts = 3

        while (!enrollmentSuccess && attempts < maxAttempts) {
          attempts++
          console.log(`Webhook enrollment attempt ${attempts} of ${maxAttempts} for course ${courseId}`)

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
                // User is already enrolled, add to alreadyEnrolledCourses
                enrollmentSuccess = true
                console.log(`Contact ${contactId} is already enrolled in course ${courseId} (webhook check)`)
                alreadyEnrolledCourses.push(courseId)
              } else {
                // New enrollment successful
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
              // Wait a bit before retrying
              await new Promise((resolve) => setTimeout(resolve, 1000))
            }
          } catch (enrollError) {
            console.error(`Error during webhook enrollment attempt ${attempts} for course ${courseId}:`, enrollError)
            // Wait a bit before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }

        if (!enrollmentSuccess) {
          console.error(`All ${maxAttempts} webhook enrollment attempts failed for course ${courseId}`)
          failedCourses.push(courseId)
        }
      } else {
        console.log(
          `Enrollment for session ${sessionId} and course ${courseId} already processed or will be handled by success page. Skipping webhook enrollment.`,
        )
      }
    } catch (error) {
      console.error(`Error enrolling in course ${courseId} via webhook:`, error)
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
  const body = await req.text()
  const signature = req.headers.get("stripe-signature") as string

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed.`, err.message)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Handle the event
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
    } = metadata || {}

    // Get customer email from session or metadata
    const customerEmail = session.customer_email || email

    console.log(`Webhook received for completed checkout session: ${session.id}`)
    console.log(`Customer email: ${customerEmail}`)
    console.log(`Session metadata:`, metadata)

    try {
      // Create or update contact in ClickFunnels
      if (customerEmail) {
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

        if (contactResult.success && contactResult.contactId) {
          console.log(`Contact created/updated via webhook with ID: ${contactResult.contactId}`)

          // Haal het product op om de cursus IDs te krijgen
          const productId = product_id
          const courseId = course_id
          const product = productId ? getProductById(productId as string) : undefined
          const courseIds = product?.metadata?.clickfunnels_course_ids || []

          // Voor backward compatibility, voeg het oude courseId toe als het niet al in de lijst staat
          if (courseId && !courseIds.includes(courseId as string)) {
            courseIds.push(courseId as string)
          }

          console.log("Course IDs for webhook enrollment:", courseIds)

          // Als er course IDs zijn en een contact ID, schrijf de klant in voor de cursussen
          // Only handle enrollment if it's not being handled by the success page
          if (courseIds.length > 0 && contactResult.contactId && enrollment_handled_by !== "success_page") {
            console.log(`Webhook enrolling contact ${contactResult.contactId} in ${courseIds.length} courses...`)

            const enrollmentResult = await enrollUserInCoursesWebhook(contactResult.contactId, courseIds, session.id)

            if (enrollmentResult.enrolledCourses.length > 0) {
              console.log(
                `Successfully enrolled in courses via webhook: ${enrollmentResult.enrolledCourses.join(", ")}`,
              )
            }

            if (enrollmentResult.alreadyEnrolledCourses.length > 0) {
              console.log(`User was already enrolled in courses: ${enrollmentResult.alreadyEnrolledCourses.join(", ")}`)
            }

            if (enrollmentResult.failedCourses.length > 0) {
              console.warn(`Failed to enroll in some courses via webhook: ${enrollmentResult.failedCourses.join(", ")}`)
            }
          } else if (courseIds.length > 0 && contactResult.contactId) {
            console.log(
              `Enrollment for session ${session.id} is handled by the success page. Skipping webhook enrollment.`,
            )
          }
        } else {
          console.error("Failed to create/update contact via webhook:", contactResult.error)
        }
      } else {
        console.error("No customer email found in session or metadata")
      }
    } catch (error) {
      console.error("Error processing webhook:", error)
    }
  }

  return new NextResponse(JSON.stringify({ received: true }))
}
