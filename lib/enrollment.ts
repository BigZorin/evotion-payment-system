"use server"

import type { ClickFunnelsEnrollment } from "./types"

// Deze waarden moeten worden ingesteld als omgevingsvariabelen
const CLICKFUNNELS_SUBDOMAIN = process.env.CLICKFUNNELS_SUBDOMAIN || "myworkspace" // Vervang met je subdomain
const CLICKFUNNELS_WORKSPACE_ID = process.env.CLICKFUNNELS_WORKSPACE_ID || "" // Vervang met je workspace ID
const API_TOKEN = process.env.CLICKFUNNELS_API_TOKEN
const CLICKFUNNELS_ACCOUNT_ID = process.env.CLICKFUNNELS_ACCOUNT_ID || ""

export async function createCourseEnrollment(enrollment: ClickFunnelsEnrollment) {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  try {
    console.log(
      `Creating course enrollment for contact ID: ${enrollment.contact_id} in course ID: ${enrollment.course_id}`,
    )

    // First, check if the contact is already enrolled in the course
    const existingEnrollments = await getContactEnrollments(enrollment.contact_id, enrollment.course_id)

    // If the contact is already enrolled, return success without creating a new enrollment
    if (existingEnrollments.success && existingEnrollments.data && existingEnrollments.data.length > 0) {
      console.log(
        `Contact ${enrollment.contact_id} is already enrolled in course ${enrollment.course_id}. Skipping enrollment.`,
      )
      return {
        success: true,
        data: existingEnrollments.data[0],
        alreadyEnrolled: true,
      }
    }

    // Check if course_id is a string (like "eWbLVk") or a number
    const courseId = typeof enrollment.course_id === "string" ? enrollment.course_id : enrollment.course_id.toString()

    // URL voor het aanmaken van een enrollment
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/courses/${courseId}/enrollments`

    console.log(`Using ClickFunnels Enrollment API URL: ${API_URL}`)

    // Updated enrollment data structure based on the example
    const enrollmentData = {
      courses_enrollment: {
        contact_id: enrollment.contact_id,
        suspended: false, // Add this field based on the example
        origination_source_type: enrollment.origination_source_type || "api",
        origination_source_id: enrollment.origination_source_id || 1,
      },
    }

    console.log(`Enrollment data:`, JSON.stringify(enrollmentData, null, 2))

    // Create the enrollment in ClickFunnels
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
      },
      body: JSON.stringify(enrollmentData),
    })

    const responseText = await response.text()
    console.log(`ClickFunnels Enrollment API response status: ${response.status}`)
    console.log(`ClickFunnels Enrollment API response body: ${responseText}`)

    if (!response.ok) {
      console.error("ClickFunnels Enrollment API error:", responseText)

      // Try to parse the error response for more details
      try {
        const errorData = JSON.parse(responseText)
        console.error("Detailed enrollment error:", errorData)

        // Check if there's a specific error message we can handle
        if (errorData.errors && errorData.errors.length > 0) {
          const errorMessages = errorData.errors
            .map((err: any) => err.detail || err.message || JSON.stringify(err))
            .join(", ")
          throw new Error(`ClickFunnels Enrollment API error: ${errorMessages}`)
        }
      } catch (parseError) {
        // If we can't parse the error, just continue with the original error
        console.error("Could not parse error response:", parseError)
      }

      throw new Error(`ClickFunnels Enrollment API error: ${response.status}`)
    }

    const data = JSON.parse(responseText)
    return { success: true, data, alreadyEnrolled: false }
  } catch (error) {
    console.error("Error creating ClickFunnels enrollment:", error)
    return { success: false, error: String(error) }
  }
}

export async function getContactEnrollments(contactId: number, courseId: string | number) {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  try {
    console.log(`Checking enrollments for contact ID: ${contactId} in course ID: ${courseId}`)

    // URL voor het ophalen van enrollments met filter op contact_id
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/courses/${courseId}/enrollments?filter[contact_id]=${contactId}`

    console.log(`Using ClickFunnels Enrollment API URL: ${API_URL}`)

    // Get enrollments from ClickFunnels
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
      },
    })

    const responseText = await response.text()
    console.log(`ClickFunnels Enrollment API response status: ${response.status}`)
    console.log(`ClickFunnels Enrollment API response body: ${responseText}`)

    if (!response.ok) {
      console.error("ClickFunnels Enrollment API error:", responseText)
      throw new Error(`ClickFunnels Enrollment API error: ${response.status}`)
    }

    // Parse the response as an array of enrollment objects
    const data = JSON.parse(responseText)

    // Log the number of enrollments found
    console.log(`Found ${data.length} existing enrollments for contact ${contactId} in course ${courseId}`)

    // Check if any of the enrollments are not suspended
    const activeEnrollments = data.filter((enrollment: any) => enrollment.suspended !== true)
    console.log(`Found ${activeEnrollments.length} active (non-suspended) enrollments`)

    return { success: true, data: activeEnrollments }
  } catch (error) {
    console.error("Error getting ClickFunnels enrollments:", error)
    return { success: false, error: String(error) }
  }
}

// Add a function to track enrollments to prevent duplicates
const enrollmentTracker = new Map<string, boolean>()

// Maak deze functie async, ook al voert het geen asynchrone operaties uit
export async function trackEnrollment(
  sessionId: string,
  contactId: number,
  courseId: string | number,
): Promise<boolean> {
  const key = `${sessionId}_${contactId}_${courseId}`

  if (enrollmentTracker.has(key)) {
    console.log(`Enrollment already processed for session ${sessionId}, contact ${contactId}, course ${courseId}`)
    return false
  }

  enrollmentTracker.set(key, true)
  console.log(`Tracking new enrollment for session ${sessionId}, contact ${contactId}, course ${courseId}`)
  return true
}
