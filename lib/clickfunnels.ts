"use server"

import type { ClickFunnelsContact } from "./types"

const API_BASE_URL = "https://api.clickfunnels.com/api/v2"
const API_TOKEN = process.env.CLICKFUNNELS_API_TOKEN

export async function createClickFunnelsContact(contact: ClickFunnelsContact) {
  if (!API_TOKEN) {
    throw new Error("ClickFunnels API token is niet geconfigureerd")
  }

  try {
    // Create the contact in ClickFunnels
    const response = await fetch(`${API_BASE_URL}/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({
        contact: {
          email: contact.email,
          first_name: contact.first_name || "",
          last_name: contact.last_name || "",
          phone: contact.phone || "",
          custom_fields: contact.custom_fields || {},
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("ClickFunnels API error:", errorData)
      throw new Error(`ClickFunnels API error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error creating ClickFunnels contact:", error)
    throw error
  }
}
