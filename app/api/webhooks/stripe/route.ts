// Voeg deze functie toe aan de webhook handler
import { trackEnrollment } from "@/lib/enrollment-tracker"
import { createCourseEnrollment } from "@/lib/enrollment"
import { getProductById } from "@/lib/products"

async function enrollUserInCoursesWebhook(
  contactId: number,
  courseIds: string[],
  sessionId: string,
): Promise<{
  success: boolean
  enrolledCourses: string[]
  failedCourses: string[]
}> {
  const enrolledCourses: string[] = []
  const failedCourses: string[] = []

  if (!courseIds || courseIds.length === 0) {
    console.log("No courses to enroll in via webhook")
    return { success: true, enrolledCourses, failedCourses }
  }

  console.log(`Webhook enrolling contact ${contactId} in ${courseIds.length} courses...`)

  // Process each course enrollment sequentially
  for (const courseId of courseIds) {
    try {
      // Check if this enrollment has already been processed
      if (trackEnrollment(sessionId, contactId, courseId)) {
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
              enrollmentSuccess = true
              console.log(`Successfully enrolled contact in course ${courseId} via webhook on attempt ${attempts}`)
              enrolledCourses.push(courseId)
              break
            } else if (enrollmentResult.alreadyEnrolled) {
              // User is already enrolled, count as success
              enrollmentSuccess = true
              console.log(`Contact ${contactId} is already enrolled in course ${courseId} (webhook check)`)
              enrolledCourses.push(courseId)
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
    failedCourses,
  }
}

// In de POST handler, update de enrollment logica:
// Binnen de checkout.session.completed handler, waar de enrollment plaatsvindt:

// Haal het product op om de cursus IDs te krijgen
const productId = session?.metadata?.product_id
const courseId = session?.metadata?.course_id
const product = productId ? getProductById(productId as string) : undefined
const courseIds = product?.metadata?.clickfunnels_course_ids || []

// Voor backward compatibility, voeg het oude courseId toe als het niet al in de lijst staat
if (courseId && !courseIds.includes(courseId as string)) {
  courseIds.push(courseId as string)
}

console.log("Course IDs for webhook enrollment:", courseIds)

// Als er course IDs zijn en een contact ID, schrijf de klant in voor de cursussen
// Only handle enrollment if it's not being handled by the success page
if (courseIds.length > 0 && contactId && enrollment_handled_by !== "success_page") {
  console.log(`Webhook enrolling contact ${contactId} in ${courseIds.length} courses...`)

  const enrollmentResult = await enrollUserInCoursesWebhook(contactId, courseIds, session.id)

  if (enrollmentResult.enrolledCourses.length > 0) {
    console.log(`Successfully enrolled in courses via webhook: ${enrollmentResult.enrolledCourses.join(", ")}`)
  }

  if (enrollmentResult.failedCourses.length > 0) {
    console.warn(`Failed to enroll in some courses via webhook: ${enrollmentResult.failedCourses.join(", ")}`)
  }
} else if (courseIds.length > 0 && contactId) {
  console.log(`Enrollment for session ${session.id} is handled by the success page. Skipping webhook enrollment.`)
}
