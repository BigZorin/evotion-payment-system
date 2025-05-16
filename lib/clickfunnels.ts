"use server"

import type { ClickFunnelsContact } from "./types"

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
    console.log(`Processing contact for ClickFunnels: ${contact.email}`)
    
    // Stap 1: Zoek eerst of het contact al bestaat
    const searchURL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts?filter[email_address]=${encodeURIComponent(contact.email)}`
    
    console.log(`Searching for existing contact: ${searchURL}`)
    
    const searchResponse = await fetch(searchURL, {
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
        "Accept": "application/json"
      }
    })
    
    if (!searchResponse.ok) {
      console.error(`Error searching for contact: ${searchResponse.status}`)
      const errorText = await searchResponse.text()
      console.error(`Error details: ${errorText}`)
      throw new Error(`Error searching for contact: ${searchResponse.status}`)
    }
    
    const existingContacts = await searchResponse.json()
    console.log(`Found ${existingContacts.length} existing contacts with email ${contact.email}`)
    
    // Als het contact bestaat, update het
    if (existingContacts.length > 0) {
      const existingContact = existingContacts[0]
      console.log(`Updating existing contact with ID: ${existingContact.id}`)
      
      // Update het bestaande contact
      return await updateClickFunnelsContact(existingContact.id, contact)
    }
    
    // Als het contact niet bestaat, maak een nieuw contact aan
    console.log(`Creating new contact for ${contact.email}`)
    
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts`
    
    const requestBody = {
      contact: {
        email_address: contact.email,
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        phone_number: contact.phone || "",
        custom_attributes: contact.custom_fields || {},
      }
    }
    
    console.log(`Request body: ${JSON.stringify(requestBody, null, 2)}`)
    
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
    
    // Als we tags willen toevoegen, doen we dat in een aparte stap
    if (contact.tags && contact.tags.length > 0 && data.id) {
      await addTagsToContact(data.id, contact.tags)
    }
    
    return data
  } catch (error) {
    console.error("Error creating ClickFunnels contact:", error)
    throw error
  }
}

// Functie om een bestaand contact bij te werken
async function updateClickFunnelsContact(contactId: number, contact: ClickFunnelsContact) {
  try {
    const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts/${contactId}`
    
    const requestBody = {
      contact: {
        // We laten email_address weg omdat dat niet kan worden gewijzigd
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        phone_number: contact.phone || "",
        custom_attributes: contact.custom_fields || {},
      }
    }
    
    console.log(`Update request body: ${JSON.stringify(requestBody, null, 2)}`)
    
    const response = await fetch(API_URL, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody),
    })
    
    const responseText = await response.text()
    console.log(`Update response status: ${response.status}`)
    console.log(`Update response body: ${responseText}`)
    
    if (!response.ok) {
      console.error("Error updating contact:", responseText)
      throw new Error(`Error updating contact: ${response.status}`)
    }
    
    const data = JSON.parse(responseText)
    
    // Voeg tags toe aan het bijgewerkte contact
    if (contact.tags && contact.tags.length > 0) {
      await addTagsToContact(contactId, contact.tags)
    }
    
    return data
  } catch (error) {
    console.error(`Error updating contact ${contactId}:`, error)
    throw error
  }
}

// Functie om tags toe te voegen aan een contact
async function addTagsToContact(contactId: number, tagNames: string[]) {
  try {
    for (const tagName of tagNames) {
      const API_URL = `https://${CLICKFUNNELS_SUBDOMAIN}.myclickfunnels.com/api/v2/workspaces/${CLICKFUNNELS_WORKSPACE_ID}/contacts/${contactId}/apply_tags`
      
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
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Error applying tag "${tagName}":`, errorText)
        // We gaan door met de volgende tag, zelfs als deze mislukt
      }
    }
  } catch (error) {
    console.error("Error adding tags to contact:", error)
    // We laten de functie doorgaan zelfs als tags niet kunnen worden toegevoegd
  }
}