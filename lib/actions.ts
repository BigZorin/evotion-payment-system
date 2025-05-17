"use server"

import { stripe } from "./stripe" // Import stripe
import { trackEnrollment } from "./enrollment-tracker" // Import trackEnrollment
import { createCourseEnrollment, getContactEnrollments } from "./enrollment" // Import enrollment functions
import { getProductById } from "./products" // Import getProductById
import { upsertClickFunnelsContact, getContactByEmail } from "./clickfunnels" // Import upsertClickFunnelsContact
import type { CompanyDetails } from "./types"

// Constanten voor betere leesbaarheid en onderhoud
const MAX_ENROLLMENT_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

// Implementeer de createCheckoutSession functie
export async function createCheckoutSession({
  productId,
  customerEmail,
  customerFirstName,
  customerLastName,
  customerPhone,
  customerBirthDate,
  companyDetails,
}: {
  productId: string
  customerEmail: string
  customerFirstName: string
  customerLastName: string
  customerPhone?: string
  customerBirthDate?: string
  companyDetails?: CompanyDetails
}) {
  try {
    console.log(`Creating checkout session for product ${productId} and customer ${customerEmail}`)

    // Haal het product op
    const product = getProductById(productId)
    if (!product) {
      throw new Error(`Product met ID ${productId} niet gevonden`)
    }

    // Bepaal de success en cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/checkout/${productId}`

    // Stel de metadata samen
    const metadata: Record<string, string> = {
      productId,
      productName: product.name,
      email: customerEmail,
      first_name: customerFirstName,
      last_name: customerLastName,
      enrollment_handled_by: "success_page", // Geef aan dat de success page de enrollment zal afhandelen
    }

    // Voeg optionele velden toe aan metadata als ze bestaan
    if (customerPhone) metadata.phone = customerPhone
    if (customerBirthDate) metadata.birth_date = customerBirthDate
    if (product.metadata?.clickfunnels_membership_level) {
      metadata.membership_level = product.metadata.clickfunnels_membership_level
    }
    if (product.metadata?.kahunas_package) {
      metadata.kahunasPackage = product.metadata.kahunas_package
    }

    // Voeg cursus IDs toe aan metadata als ze bestaan
    if (product.metadata?.clickfunnels_course_ids && Array.isArray(product.metadata.clickfunnels_course_ids)) {
      metadata.clickfunnels_course_ids = JSON.stringify(product.metadata.clickfunnels_course_ids)
    }

    // Voeg bedrijfsgegevens toe aan metadata als ze bestaan
    if (companyDetails) {
      metadata.company_name = companyDetails.name
      if (companyDetails.vatNumber) metadata.vat_number = companyDetails.vatNumber
      if (companyDetails.address) metadata.company_address = companyDetails.address
      if (companyDetails.postalCode) metadata.company_postal_code = companyDetails.postalCode
      if (companyDetails.city) metadata.company_city = companyDetails.city
    }

    // Maak de checkout sessie aan
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "ideal"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: product.name,
              description: product.description,
              metadata: {
                productId,
              },
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata,
      payment_intent_data: {
        metadata, // Dupliceer metadata in payment intent voor webhook toegang
      },
      invoice_creation: {
        enabled: true,
      },
    })

    console.log(`Checkout session created with ID: ${session.id}`)
    return { sessionId: session.id }
  } catch (error) {
    console.error("Error creating checkout session:", error)
    throw error
  }
}

// Verbeterde functie om gebruikers in te schrijven voor cursussen
export async function enrollUserInCourses(
  contactId: number,
  courseIds: string[],
  sessionId: string,
): Promise<{
  success: boolean
  enrolledCourses: string[]
  alreadyEnrolledCourses: string[]
  failedCourses: string[]
}> {
  const enrolledCourses: string[] = []
  const alreadyEnrolledCourses: string[] = []
  const failedCourses: string[] = []

  if (!courseIds || courseIds.length === 0) {
    console.log("No courses to enroll in")
    return { success: true, enrolledCourses, alreadyEnrolledCourses, failedCourses }
  }

  console.log(`Enrolling contact ${contactId} in ${courseIds.length} courses...`)

  // Gebruik Promise.all voor parallelle verwerking van voorcontroles
  const enrollmentChecks = await Promise.all(
    courseIds.map(async (courseId) => {
      try {
        // Controleer eerst of de gebruiker al is ingeschreven voor deze cursus
        const existingEnrollments = await getContactEnrollments(contactId, courseId)
        const isAlreadyEnrolled =
          existingEnrollments.success && existingEnrollments.data && existingEnrollments.data.length > 0

        // Controleer of deze inschrijving al is verwerkt
        const canTrackEnrollment = await trackEnrollment(sessionId, contactId, courseId)

        return {
          courseId,
          isAlreadyEnrolled,
          canTrackEnrollment,
        }
      } catch (error) {
        console.error(`Error checking enrollment for course ${courseId}:`, error)
        return {
          courseId,
          isAlreadyEnrolled: false,
          canTrackEnrollment: false,
          error,
        }
      }
    }),
  )

  // Verwerk de resultaten van de voorcontroles
  for (const check of enrollmentChecks) {
    const { courseId, isAlreadyEnrolled, canTrackEnrollment, error } = check

    if (error) {
      console.error(`Error in pre-check for course ${courseId}:`, error)
      failedCourses.push(courseId)
      continue
    }

    if (isAlreadyEnrolled) {
      console.log(`Contact ${contactId} is already enrolled in course ${courseId}. Skipping enrollment.`)
      alreadyEnrolledCourses.push(courseId)
      continue
    }

    if (!canTrackEnrollment) {
      console.log(
        `Enrollment for session ${sessionId} and course ${courseId} already processed or will be handled by webhook. Skipping.`,
      )
      continue
    }

    // Probeer de inschrijving te maken
    console.log(`Creating new enrollment for contact ${contactId} in course ${courseId}...`)

    let enrollmentSuccess = false
    let attempts = 0

    while (!enrollmentSuccess && attempts < MAX_ENROLLMENT_ATTEMPTS) {
      attempts++
      console.log(`Enrollment attempt ${attempts} of ${MAX_ENROLLMENT_ATTEMPTS} for course ${courseId}`)

      try {
        const enrollmentResult = await createCourseEnrollment({
          contact_id: contactId,
          course_id: courseId,
          origination_source_type: "stripe_checkout",
          origination_source_id: 1,
        })

        console.log(`Attempt ${attempts} result for course ${courseId}:`, enrollmentResult)

        if (enrollmentResult.success) {
          if (enrollmentResult.alreadyEnrolled) {
            // User is already enrolled, add to alreadyEnrolledCourses
            enrollmentSuccess = true
            console.log(`Contact ${contactId} is already enrolled in course ${courseId}`)
            alreadyEnrolledCourses.push(courseId)
          } else {
            // New enrollment successful
            enrollmentSuccess = true
            console.log(`Successfully enrolled contact in course ${courseId} on attempt ${attempts}`)
            enrolledCourses.push(courseId)
          }
          break
        } else {
          console.error(
            `Failed to enroll contact in course ${courseId} on attempt ${attempts}:`,
            enrollmentResult.error,
          )
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        }
      } catch (enrollError) {
        console.error(`Error during enrollment attempt ${attempts} for course ${courseId}:`, enrollError)
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }

    if (!enrollmentSuccess) {
      console.error(`All ${MAX_ENROLLMENT_ATTEMPTS} enrollment attempts failed for course ${courseId}`)
      failedCourses.push(courseId)
    }
  }

  return {
    success: failedCourses.length === 0,
    enrolledCourses,
    alreadyEnrolledCourses,
    failedCourses,
  }
}

// Update de handleSuccessfulPayment functie om meerdere cursussen te ondersteunen
export async function handleSuccessfulPayment(sessionId: string) {
  try {
    // Haal de Stripe Checkout Session op
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["invoice", "customer"],
    })

    if (!session) {
      throw new Error("Sessie niet gevonden")
    }

    // Controleer de betalingsstatus
    if (session.payment_status !== "paid") {
      return { success: false, error: "Betaling niet voltooid" }
    }

    // Extraheer gegevens uit de sessie
    const { customer_email: sessionEmail, metadata, customer } = session

    const {
      first_name: firstName,
      last_name: lastName,
      name: customerName,
      phone,
      birth_date: birthDate,
      productId,
      productName,
      courseId, // Oude single course ID (voor backward compatibility)
      kahunasPackage,
      stripeCustomerId,
      email: metadataEmail,
      enrollment_handled_by,
      clickfunnels_course_ids: courseIdsJson,
    } = metadata || {}

    // Use email from metadata if session email is null
    const customerEmail = sessionEmail || metadataEmail || ""

    console.log("Session metadata:", metadata)

    // Haal het product op om de cursus IDs te krijgen
    const product = productId ? getProductById(productId as string) : undefined
    let courseIds: string[] = product?.metadata?.clickfunnels_course_ids || []

    // Probeer courseIds uit JSON te parsen als het beschikbaar is
    if (courseIdsJson) {
      try {
        const parsedCourseIds = JSON.parse(courseIdsJson as string)
        if (Array.isArray(parsedCourseIds)) {
          courseIds = parsedCourseIds
        }
      } catch (e) {
        console.error("Error parsing course IDs from JSON:", e)
      }
    }

    // Voor backward compatibility, voeg het oude courseId toe als het niet al in de lijst staat
    if (courseId && !courseIds.includes(courseId as string)) {
      courseIds.push(courseId as string)
    }

    console.log("Course IDs for enrollment:", courseIds)
    console.log("Using email:", customerEmail)

    // Basis response
    let response = {
      success: true,
      partialSuccess: false,
      customerEmail: customerEmail,
      customerName: customerName as string,
      firstName: firstName as string,
      lastName: lastName as string,
      phone: phone as string,
      birthDate: birthDate as string,
      productName: productName as string,
      productId: productId as string,
      kahunasPackage: kahunasPackage as string,
      stripeCustomerId: stripeCustomerId || (typeof customer === "string" ? customer : customer?.id),
      hasEnrollment: false,
      courseIds: courseIds,
      enrolledCourses: [] as string[],
      alreadyEnrolledCourses: [] as string[],
      failedCourses: [] as string[],
      error: null as string | null,
      invoiceUrl: null as string | null,
      invoicePdf: null as string | null,
    }

    // Haal factuurgegevens op als die beschikbaar zijn
    if (session.invoice) {
      try {
        const invoice =
          typeof session.invoice === "string" ? await stripe.invoices.retrieve(session.invoice) : session.invoice

        response.invoiceUrl = invoice.hosted_invoice_url || null
        response.invoicePdf = invoice.invoice_pdf || null

        // Ensure invoice is sent by email
        if (invoice.status === "paid" && !invoice.post_payment_credit_notes_amount) {
          try {
            await stripe.invoices.sendInvoice(invoice.id)
            console.log(`Invoice ${invoice.id} sent to ${customerEmail}`)
          } catch (emailError) {
            console.error("Error sending invoice email:", emailError)
          }
        }
      } catch (error) {
        console.error("Fout bij het ophalen van factuurgegevens:", error)
      }
    } else {
      // If no invoice was created automatically, create one
      try {
        if (customer) {
          // Create invoice item
          const customerId = typeof customer === "string" ? customer : customer.id

          const invoiceItem = await stripe.invoiceItems.create({
            customer: customerId,
            amount: session.amount_total || 0,
            currency: session.currency || "eur",
            description: `Betaling voor ${productName || "dienst"}`,
          })

          // Create and finalize invoice
          const invoice = await stripe.invoices.create({
            customer: customerId,
            auto_advance: true,
            collection_method: "charge_automatically",
            description: `Factuur voor ${productName || "dienst"}`,
          })

          // Finalize and send invoice
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)

          if (finalizedInvoice.status === "paid") {
            await stripe.invoices.sendInvoice(finalizedInvoice.id)
            console.log(`Manual invoice created and sent to ${customerEmail}`)

            response.invoiceUrl = finalizedInvoice.hosted_invoice_url || null
            response.invoicePdf = finalizedInvoice.invoice_pdf || null
          }
        }
      } catch (invoiceError) {
        console.error("Error creating manual invoice:", invoiceError)
      }
    }

    // Probeer het Evotion account aan te maken/bij te werken en de gebruiker in te schrijven voor de cursus
    try {
      // Get payment amount from session
      const amountTotal = session.amount_total
      const currency = session.currency
      const formattedAmount = amountTotal
        ? new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amountTotal / 100)
        : "onbekend"

      // Probeer eerst een bestaand contact bij te werken of een nieuw aan te maken
      let contactId: number | undefined

      try {
        console.log(`Upserting ClickFunnels contact for email: ${customerEmail}`)

        // Check if we have a valid email before proceeding
        if (!customerEmail) {
          console.error("Missing email for ClickFunnels contact upsert")
          throw new Error("Email is required for upserting a contact")
        }

        // Controleer eerst of het contact al bestaat
        const existingContact = await getContactByEmail(customerEmail)

        // Als het contact al bestaat, gebruik dan het bestaande contact ID
        if (existingContact.success && existingContact.contactId) {
          contactId = existingContact.contactId
          console.log(`Found existing contact with ID: ${contactId}`)
        }

        // Upsert het contact (update of maak nieuw)
        const upsertResult = await upsertClickFunnelsContact({
          email: customerEmail,
          first_name: firstName as string,
          last_name: lastName as string,
          // Explicitly omit phone to prevent the "Phone number has already been taken" error
          tags: [product?.metadata?.clickfunnels_membership_level || "basic", "stripe-customer", "paid-customer"],
          custom_fields: {
            product_id: productId || "",
            product_name: productName || "",
            membership_level: product?.metadata?.clickfunnels_membership_level || "basic",
            payment_amount: formattedAmount,
            payment_date: new Date().toISOString(),
            payment_method: "Stripe",
            stripe_session_id: sessionId,
            stripe_customer_id: stripeCustomerId || (typeof customer === "string" ? customer : customer?.id) || "",
            birth_date: birthDate || "",
            kahunas_package: kahunasPackage || productId || "",
            source: "checkout_payment",
          },
        })

        console.log("ClickFunnels upsert result:", upsertResult)

        if (upsertResult.success) {
          console.log(`Evotion account upserted:`, upsertResult.data)
          contactId = upsertResult.contactId
          console.log(`Contact ID: ${contactId}`)
        } else {
          console.error(`Failed to upsert ClickFunnels contact: ${upsertResult.error}`)
          throw new Error(`Failed to upsert ClickFunnels contact: ${upsertResult.error}`)
        }

        // Als er course IDs zijn en een contact ID, schrijf de klant in voor de cursussen
        if (courseIds.length > 0 && contactId) {
          console.log(`Enrolling contact ${contactId} in ${courseIds.length} courses...`)

          const enrollmentResult = await enrollUserInCourses(contactId, courseIds, sessionId)

          response = {
            ...response,
            hasEnrollment:
              enrollmentResult.enrolledCourses.length > 0 || enrollmentResult.alreadyEnrolledCourses.length > 0,
            enrolledCourses: enrollmentResult.enrolledCourses,
            alreadyEnrolledCourses: enrollmentResult.alreadyEnrolledCourses,
            failedCourses: enrollmentResult.failedCourses,
          }

          if (enrollmentResult.alreadyEnrolledCourses.length > 0) {
            console.log(`User was already enrolled in courses: ${enrollmentResult.alreadyEnrolledCourses.join(", ")}`)
          }

          if (enrollmentResult.failedCourses.length > 0) {
            console.warn(`Failed to enroll in some courses: ${enrollmentResult.failedCourses.join(", ")}`)
          }
        } else {
          console.log(`No courses to enroll in or missing contact ID (${contactId})`)
        }
      } catch (error: any) {
        console.error("Error updating/creating Evotion account or enrollment:", error)
        response = {
          ...response,
          success: true,
          partialSuccess: true,
          error:
            "Er is een probleem opgetreden bij het aanmaken van je account. Neem contact op met de klantenservice.",
        }
      }
    } catch (error: any) {
      console.error("Error processing successful payment:", error)
      response = { ...response, success: false, error: "Er is een fout opgetreden bij het verwerken van je betaling." }
    }

    return response
  } catch (error: any) {
    console.error("Error in handleSuccessfulPayment:", error)
    return { success: false, error: "Er is een fout opgetreden bij het verwerken van je betaling." }
  }
}

/**
 * Controleert de status van een betaling
 * @param sessionId Het ID van de Stripe checkout sessie
 * @returns Een object met de status van de betaling
 */
export async function checkPaymentStatus(sessionId: string) {
  try {
    // Haal de sessie op van Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    return {
      success: true,
      status: session.payment_status,
      customerEmail: session.customer_email,
      amount: session.amount_total,
      currency: session.currency,
    }
  } catch (error: any) {
    console.error("Error checking payment status:", error)
    return { success: false, error: error.message || "Er is een fout opgetreden" }
  }
}
