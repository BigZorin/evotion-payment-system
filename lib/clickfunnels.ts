export async function createClickFunnelsContact(data: any): Promise<any> {
  try {
    const apiKey = process.env.CLICKFUNNELS_API_KEY
    const accountId = process.env.CLICKFUNNELS_ACCOUNT_ID

    if (!apiKey || !accountId) {
      console.error("ClickFunnels API key or account ID not found in environment variables.")
      return { success: false, error: "Missing API key or account ID" }
    }

    const url = `https://api.clickfunnels.com/v1/accounts/${accountId}/contacts`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ contact: data }),
    })

    const result = await response.json()

    if (response.ok) {
      console.log("ClickFunnels contact created successfully:", result)
      return { success: true, data: result.contact, contactId: result.contact.id }
    } else {
      console.error("Failed to create ClickFunnels contact:", result)
      return { success: false, error: result.error }
    }
  } catch (error: any) {
    console.error("Error creating ClickFunnels contact:", error)
    return { success: false, error: error.message }
  }
}

export async function updateClickFunnelsContact(data: any): Promise<any> {
  try {
    const apiKey = process.env.CLICKFUNNELS_API_KEY
    const accountId = process.env.CLICKFUNNELS_ACCOUNT_ID

    if (!apiKey || !accountId) {
      console.error("ClickFunnels API key or account ID not found in environment variables.")
      return { success: false, error: "Missing API key or account ID" }
    }

    // Zoek eerst de contactpersoon op basis van e-mail
    const getContactUrl = `https://api.clickfunnels.com/v1/accounts/${accountId}/contacts?query=${data.email}`
    const getContactResponse = await fetch(getContactUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    })

    const getContactResult = await getContactResponse.json()

    if (getContactResponse.ok && getContactResult.contacts && getContactResult.contacts.length > 0) {
      // Contact gevonden, gebruik de eerste
      const contactId = getContactResult.contacts[0].id
      const url = `https://api.clickfunnels.com/v1/accounts/${accountId}/contacts/${contactId}`

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ contact: data }),
      })

      const result = await response.json()

      if (response.ok) {
        console.log("ClickFunnels contact updated successfully:", result)
        return { success: true, data: result.contact, contactId: contactId }
      } else {
        console.error("Failed to update ClickFunnels contact:", result)
        return { success: false, error: result.error }
      }
    } else {
      console.log("Contact not found, will attempt to create a new one.")
      return { success: false, error: "Contact not found" } // Indicate contact not found
    }
  } catch (error: any) {
    console.error("Error updating ClickFunnels contact:", error)
    return { success: false, error: error.message }
  }
}

export async function createCourseEnrollment(data: any): Promise<any> {
  try {
    const apiKey = process.env.CLICKFUNNELS_API_KEY
    const accountId = process.env.CLICKFUNNELS_ACCOUNT_ID

    if (!apiKey || !accountId) {
      console.error("ClickFunnels API key or account ID not found in environment variables.")
      return { success: false, error: "Missing API key or account ID" }
    }

    const url = `https://api.clickfunnels.com/v1/accounts/${accountId}/courses/enrollments`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (response.ok) {
      console.log("ClickFunnels course enrollment created successfully:", result)
      return { success: true, data: result }
    } else {
      console.error("Failed to create ClickFunnels course enrollment:", result)
      return { success: false, error: result.error }
    }
  } catch (error: any) {
    console.error("Error creating ClickFunnels course enrollment:", error)
    return { success: false, error: error.message }
  }
}

export async function getContactEnrollments(contactId: number, courseId: number): Promise<any> {
  try {
    const apiKey = process.env.CLICKFUNNELS_API_KEY
    const accountId = process.env.CLICKFUNNELS_ACCOUNT_ID

    if (!apiKey || !accountId) {
      console.error("ClickFunnels API key or account ID not found in environment variables.")
      return { success: false, error: "Missing API key or account ID" }
    }

    const url = `https://api.clickfunnels.com/v1/accounts/${accountId}/contacts/${contactId}/courses_enrollments?course_id=${courseId}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    })

    const result = await response.json()

    if (response.ok) {
      console.log("ClickFunnels course enrollments retrieved successfully:", result)
      return { success: true, data: result }
    } else {
      console.error("Failed to retrieve ClickFunnels course enrollments:", result)
      return { success: false, error: result.error }
    }
  } catch (error: any) {
    console.error("Error retrieving ClickFunnels course enrollments:", error)
    return { success: false, error: error.message }
  }
}
