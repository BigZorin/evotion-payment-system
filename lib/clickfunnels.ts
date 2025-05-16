"use server"

import type { ClickFunnelsContact, ClickFunnelsEnrollment } from "./types"

// Deze waarden moeten worden ingesteld als omgevingsvariabelen
const CLICKFUNNELS_SUBDOMAIN = process.env.CLICKFUNNELS_SUBDOMAIN || "myworkspace" // Vervang met je subdomain
const CLICKFUNNELS_WORKSPACE_ID = process.env.CLICKFUNNELS_WORKSPACE_ID || "" // Vervang met je workspace ID
const API_TOKEN = process.env.CLICKFUNNELS_API_TOKEN

export async function createClickFunnelsContact(contact: ClickFunnelsContact) {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!CLICKFUNNELS_WORKSPACE_ID) {
    throw new Error("ClickFunnels workspace ID is niet geconfigureerd")
  }

  try {
    console.log(`Making API request to ClickFunnels with data:`, JSON.stringify(contact, null, 2))

    // Bijgewerkte URL structuur
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts`

    console.log(`Using ClickFunnels API URL: ${API_URL}`)

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
      contactData.contact.tags = contact.tags.map((tag) => ({ name: tag }))
    }

    console.log(`Contact creation data:`, JSON.stringify(contactData, null, 2))

    // Create the contact in ClickFunnels
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
    console.log(`ClickFunnels API response status: ${response.status}`)
    console.log(`ClickFunnels API response body: ${responseText}`)

    if (!response.ok) {
      console.error("ClickFunnels API error:", responseText)
      throw new Error(`ClickFunnels API error: ${response.status}`)
    }

    const data = JSON.parse(responseText)
    return data
  } catch (error) {
    console.error("Error creating ClickFunnels contact:", error)
    throw error
  }
}

export async function updateClickFunnelsContact(contact: ClickFunnelsContact) {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  if (!contact.email) {
    throw new Error("Email is verplicht voor het bijwerken van een contact")
  }

  try {
    console.log(`Zoeken naar bestaand ClickFunnels contact met email: ${contact.email}`)

    // Zoek eerst het contact op basis van e-mail
    const SEARCH_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts?filter[email_address]=${encodeURIComponent(
      contact.email,
    )}`

    console.log(`Using ClickFunnels search URL: ${SEARCH_URL}`)

    const searchResponse = await fetch(SEARCH_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
      },
    })

    if (!searchResponse.ok) {
      console.error(`Fout bij zoeken naar contact: ${searchResponse.status}`)
      return { success: false, error: `Fout bij zoeken naar contact: ${searchResponse.status}` }
    }

    const searchData = await searchResponse.json()
    console.log(`Zoekresultaten:`, JSON.stringify(searchData, null, 2))

    // Als er geen contact is gevonden, return false
    if (!searchData.data || searchData.data.length === 0) {
      console.log(`Geen bestaand contact gevonden voor email: ${contact.email}`)
      return { success: false, error: "Contact niet gevonden" }
    }

    // Gebruik het eerste gevonden contact
    const existingContact = searchData.data[0]
    const contactId = existingContact.id

    console.log(`Bestaand contact gevonden met ID: ${contactId}`)

    // Update het contact met de nieuwe cf2-stijl endpoint en body structuur
    const UPDATE_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/contacts/${contactId}`

    console.log(`Bijwerken van contact met nieuwe API structuur, ID: ${contactId}`)

    // Prepare the contact object in the format expected by the API
    const contactData = {
      contact: {
        email_address: contact.email,
        first_name: contact.first_name || existingContact.attributes.first_name,
        last_name: contact.last_name || existingContact.attributes.last_name,
        // Explicitly omit phone_number to prevent the "Phone number has already been taken" error
        time_zone: contact.time_zone || existingContact.attributes.time_zone,
        fb_url: contact.fb_url || existingContact.attributes.fb_url,
        twitter_url: contact.twitter_url || existingContact.attributes.twitter_url,
        instagram_url: contact.instagram_url || existingContact.attributes.instagram_url,
        linkedin_url: contact.linkedin_url || existingContact.attributes.linkedin_url,
        website_url: contact.website_url || existingContact.attributes.website_url,
      },
    }

    // Add custom attributes if they exist
    if (contact.custom_fields) {
      contactData.contact.custom_attributes = contact.custom_fields
    }

    // Add tags if they exist
    if (contact.tags && contact.tags.length > 0) {
      contactData.contact.tags = contact.tags.map((tag) => ({ name: tag }))
    }

    console.log(`Contact update data:`, JSON.stringify(contactData, null, 2))

    const updateResponse = await fetch(UPDATE_URL, {
      method: "PUT", // Use PUT instead of PATCH
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
      },
      body: JSON.stringify(contactData),
    })

    const updateResponseText = await updateResponse.text()
    console.log(`ClickFunnels API update response status: ${updateResponse.status}`)
    console.log(`ClickFunnels API update response body: ${updateResponseText}`)

    if (!updateResponse.ok) {
      console.error("ClickFunnels API update error:", updateResponseText)
      return { success: false, error: `ClickFunnels API update error: ${updateResponse.status}` }
    }

    const updateData = JSON.parse(updateResponseText)
    return { success: true, data: updateData, contactId }
  } catch (error) {
    console.error("Error updating ClickFunnels contact:", error)
    return { success: false, error: String(error) }
  }
}

export async function createCourseEnrollment(enrollment: ClickFunnelsEnrollment) {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  try {
    console.log(
      `Creating course enrollment for contact ID: ${enrollment.contact_id} in course ID: ${enrollment.course_id}`,
    )

    // URL voor het aanmaken van een enrollment
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/courses/${enrollment.course_id}/enrollments`

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
    return { success: true, data }
  } catch (error) {
    console.error("Error creating ClickFunnels enrollment:", error)
    return { success: false, error: String(error) }
  }
}

export async function getContactEnrollments(contactId: number, courseId: number) {
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
