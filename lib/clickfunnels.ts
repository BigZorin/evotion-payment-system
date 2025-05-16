"use server"

import type { ClickFunnelsContact } from "./types"

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
