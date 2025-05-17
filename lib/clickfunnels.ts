"use server"

import type { ClickFunnelsContact, ClickFunnelsEnrollment } from "./types"

// Deze waarden moeten worden ingesteld als omgevingsvariabelen
const CLICKFUNNELS_SUBDOMAIN = process.env.CLICKFUNNELS_SUBDOMAIN || "myworkspace" // Vervang met je subdomain
const CLICKFUNNELS_WORKSPACE_ID = process.env.CLICKFUNNELS_WORKSPACE_ID || "" // Vervang met je workspace ID
const API_TOKEN = process.env.CLICKFUNNELS_API_TOKEN
const CLICKFUNNELS_ACCOUNT_ID = process.env.CLICKFUNNELS_ACCOUNT_ID || ""

export async function upsertClickFunnelsContact(contact: ClickFunnelsContact) {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!CLICKFUNNELS_WORKSPACE_ID) {
    throw new Error("ClickFunnels workspace ID is niet geconfigureerd")
  }

  try {
    console.log(`Making upsert API request to ClickFunnels with data:`, JSON.stringify(contact, null, 2))

    // Use the upsert endpoint
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts/upsert`

    console.log(`Using ClickFunnels upsert API URL: ${API_URL}`)

    // Prepare the contact object in the format expected by the API
    const contactData = {
      contact: {
        email_address: contact.email,
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        // Explicitly omit phone_number to prevent the "Phone number has already been taken" error
        time_zone: contact.time_zone || null,
        fb_url: contact.fb_url || null,
        twitter_url: contact.twitter_url || null,
        instagram_url: contact.instagram_url || null,
        linkedin_url: contact.linkedin_url || null,
        website_url: contact.website_url || null,
      },
    }

    // Add custom attributes if they exist
    if (contact.custom_fields) {
      contactData.contact.custom_attributes = contact.custom_fields
    }

    // Add tags if they exist
    if (contact.tags && contact.tags.length > 0) {
      contactData.contact.tag_ids = contact.tags.map((tag) => ({ name: tag }))
    }

    console.log(`Contact upsert data:`, JSON.stringify(contactData, null, 2))

    // Create or update the contact in ClickFunnels
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
      },
      body: JSON.stringify(contactData),
    })

    const responseText = await response.text()
    console.log(`ClickFunnels API upsert response status: ${response.status}`)
    console.log(`ClickFunnels API upsert response body: ${responseText}`)

    if (!response.ok) {
      console.error("ClickFunnels API upsert error:", responseText)
      throw new Error(`ClickFunnels API upsert error: ${response.status}`)
    }

    // The response is an array with a single contact object
    const data = JSON.parse(responseText)
    const contactId = data.id || (Array.isArray(data) && data.length > 0 ? data[0].id : null)

    if (!contactId) {
      throw new Error("No contact ID returned from upsert operation")
    }

    console.log(`Contact upserted with ID: ${contactId}`)

    return { success: true, data, contactId }
  } catch (error) {
    console.error("Error upserting ClickFunnels contact:", error)
    return { success: false, error: String(error) }
  }
}

export async function createClickFunnelsContact(contact: ClickFunnelsContact) {
  // For backward compatibility, just call upsert
  return upsertClickFunnelsContact(contact)
}

export async function updateClickFunnelsContact(contact: ClickFunnelsContact) {
  // For backward compatibility, just call upsert
  return upsertClickFunnelsContact(contact)
}

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
    if (
      existingEnrollments.success &&
      existingEnrollments.data &&
      existingEnrollments.data.courses_enrollments &&
      existingEnrollments.data.courses_enrollments.length > 0
    ) {
      console.log(
        `Contact ${enrollment.contact_id} is already enrolled in course ${enrollment.course_id}. Skipping enrollment.`,
      )
      return {
        success: true,
        data: existingEnrollments.data.courses_enrollments[0],
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

    // URL voor het ophalen van enrollments
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

    const data = JSON.parse(responseText)
    return { success: true, data }
  } catch (error) {
    console.error("Error getting ClickFunnels enrollments:", error)
    return { success: false, error: String(error) }
  }
}

// Add a function to track enrollments to prevent duplicates
const enrollmentTracker = new Map<string, boolean>()

export function trackEnrollment(sessionId: string, contactId: number, courseId: string | number): boolean {
  const key = `${sessionId}_${contactId}_${courseId}`

  if (enrollmentTracker.has(key)) {
    console.log(`Enrollment already processed for session ${sessionId}, contact ${contactId}, course ${courseId}`)
    return false
  }

  enrollmentTracker.set(key, true)
  console.log(`Tracking new enrollment for session ${sessionId}, contact ${contactId}, course ${courseId}`)
  return true
}
