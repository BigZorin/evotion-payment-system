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

    // Create the contact in ClickFunnels
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        contact: {
          email_address: contact.email,
          first_name: contact.first_name || "",
          last_name: contact.last_name || "",
          phone_number: contact.phone || "",
          // Voeg tags toe als ze zijn opgegeven
          tags: contact.tags ? contact.tags.map((tag) => ({ name: tag })) : undefined,
          // Voeg custom attributes toe
          custom_attributes: contact.custom_fields || {},
        },
      }),
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

  if (!CLICKFUNNELS_WORKSPACE_ID) {
    throw new Error("ClickFunnels workspace ID is niet geconfigureerd")
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

    // Update het contact
    const UPDATE_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts/${contactId}`

    console.log(`Bijwerken van contact met data:`, JSON.stringify(contact, null, 2))

    const updateResponse = await fetch(UPDATE_URL, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        contact: {
          first_name: contact.first_name || existingContact.attributes.first_name,
          last_name: contact.last_name || existingContact.attributes.last_name,
          phone_number: contact.phone || existingContact.attributes.phone_number,
          // Voeg tags toe als ze zijn opgegeven
          tags: contact.tags ? contact.tags.map((tag) => ({ name: tag })) : undefined,
          // Voeg custom attributes toe
          custom_attributes: contact.custom_fields || {},
        },
      }),
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

    // Create the enrollment in ClickFunnels
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        courses_enrollment: {
          contact_id: enrollment.contact_id,
          origination_source_type: enrollment.origination_source_type || "api",
          origination_source_id: enrollment.origination_source_id || 0,
        },
      }),
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
