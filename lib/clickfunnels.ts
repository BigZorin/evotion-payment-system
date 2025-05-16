"use server"

import type { ClickFunnelsContact } from "./types"

// Deze waarden moeten worden ingesteld als omgevingsvariabelen
const CLICKFUNNELS_SUBDOMAIN = process.env.CLICKFUNNELS_SUBDOMAIN || "myworkspace"
const CLICKFUNNELS_WORKSPACE_ID = process.env.CLICKFUNNELS_WORKSPACE_ID || ""
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

    // Bijgewerkte URL structuur met workspace subdomain
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts`

    console.log(`Using ClickFunnels API URL: ${API_URL}`)

    // Aangepaste request body op basis van de API documentatie
    const requestBody = {
      contact: {
        email_address: contact.email,
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        phone_number: contact.phone || "",
        // Geen tags veld direct in het contact object
        custom_attributes: contact.custom_fields || {},
      }
    }

    console.log(`Request body: ${JSON.stringify(requestBody, null, 2)}`)

    // Create the contact in ClickFunnels
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log(`ClickFunnels API response status: ${response.status}`)
    console.log(`ClickFunnels API response body: ${responseText}`)

    if (!response.ok) {
      console.error("ClickFunnels API error:", responseText)
      throw new Error(`ClickFunnels API error: ${response.status}`)
    }

    const data = JSON.parse(responseText)
    
    // Als we tags willen toevoegen, moeten we dat in een aparte API call doen
    if (contact.tags && contact.tags.length > 0 && data.id) {
      await addTagsToContact(data.id, contact.tags)
    }
    
    return data
  } catch (error) {
    console.error("Error creating ClickFunnels contact:", error)
    throw error
  }
}

// Functie om tags toe te voegen aan een bestaand contact
async function addTagsToContact(contactId: number, tagNames: string[]) {
  try {
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts/${contactId}/apply_tags`
    
    // Voor elke tag, maak een aparte API call
    for (const tagName of tagNames) {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_TOKEN}`,
          "Accept": "application/json"
        },
        body: JSON.stringify({
          tag: {
            name: tagName
          }
        }),
      })
      
      console.log(`Applied tag "${tagName}" to contact ${contactId}, status: ${response.status}`)
    }
  } catch (error) {
    console.error("Error adding tags to contact:", error)
    // We laten de functie doorgaan zelfs als tags niet kunnen worden toegevoegd
  }
}