import { stripe } from "./stripe" // Import stripe
import { trackEnrollment, createCourseEnrollment, getContactEnrollments } from "./enrollment" // Import enrollment functions
import { getProductById } from "./products" // Import getProductById
import { upsertClickFunnelsContact } from "./clickfunnels" // Import upsertClickFunnelsContact

// Voeg deze functie toe aan actions.ts
async function enrollUserInCourses(
  contactId: number,
  courseIds: string[],
  sessionId: string,
): Promise<{
  success: boolean
  enrolledCourses: string[]
  failedCourses: string[]
}> {
  const enrolledCourses: string[] = []
  const failedCourses: string[] = []

  if (!courseIds || courseIds.length === 0) {
    console.log("No courses to enroll in")
    return { success: true, enrolledCourses, failedCourses }
  }

  console.log(`Enrolling contact ${contactId} in ${courseIds.length} courses...`)

  // Process each course enrollment sequentially
  for (const courseId of courseIds) {
    try {
      // Check if this enrollment has already been processed
      if (trackEnrollment(sessionId, contactId, courseId)) {
        console.log(`Creating new enrollment for contact ${contactId} in course ${courseId}...`)

        // Try multiple times with different approaches if needed
        let enrollmentSuccess = false
        let attempts = 0
        const maxAttempts = 3

        while (!enrollmentSuccess && attempts < maxAttempts) {
          attempts++
          console.log(`Enrollment attempt ${attempts} of ${maxAttempts} for course ${courseId}`)

          try {
            const enrollmentResult = await createCourseEnrollment({
              contact_id: contactId,
              course_id: courseId,
              origination_source_type: "stripe_checkout",
              origination_source_id: 1,
            })

            console.log(`Attempt ${attempts} result for course ${courseId}:`, enrollmentResult)

            if (enrollmentResult.success) {
              enrollmentSuccess = true
              console.log(`Successfully enrolled contact in course ${courseId} on attempt ${attempts}`)
              enrolledCourses.push(courseId)
              break
            } else if (enrollmentResult.alreadyEnrolled) {
              // User is already enrolled, count as success
              enrollmentSuccess = true
              console.log(`Contact ${contactId} is already enrolled in course ${courseId}`)
              enrolledCourses.push(courseId)
              break
            } else {
              console.error(
                `Failed to enroll contact in course ${courseId} on attempt ${attempts}:`,
                enrollmentResult.error,
              )
              // Wait a bit before retrying
              await new Promise((resolve) => setTimeout(resolve, 1000))
            }
          } catch (enrollError) {
            console.error(`Error during enrollment attempt ${attempts} for course ${courseId}:`, enrollError)
            // Wait a bit before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }

        if (!enrollmentSuccess) {
          console.error(`All ${maxAttempts} enrollment attempts failed for course ${courseId}`)
          failedCourses.push(courseId)
        }
      } else {
        console.log(
          `Enrollment for session ${sessionId} and course ${courseId} already processed or will be handled by webhook. Skipping.`,
        )

        // Check if the user is already enrolled
        const existingEnrollments = await getContactEnrollments(contactId, courseId)
        if (
          existingEnrollments.success &&
          existingEnrollments.data &&
          existingEnrollments.data.courses_enrollments &&
          existingEnrollments.data.courses_enrollments.length > 0
        ) {
          console.log(`Contact ${contactId} is already enrolled in course ${courseId}.`)
          enrolledCourses.push(courseId)
        }
      }
    } catch (error) {
      console.error(`Error enrolling in course ${courseId}:`, error)
      failedCourses.push(courseId)
    }
  }

  return {
    success: failedCourses.length === 0,
    enrolledCourses,
    failedCourses,
  }
}

// Update de handleSuccessfulPayment functie om meerdere cursussen te ondersteunen
export async function handleSuccessfulPayment(sessionId: string) {
  try {
    // Haal de Stripe Checkout Session op
    const session = await stripe.checkout.sessions.retrieve(sessionId)

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
    } = metadata || {}

    // Use email from metadata if session email is null
    const customerEmail = sessionEmail || metadataEmail || ""

    console.log("Session metadata:", metadata)

    // Haal het product op om de cursus IDs te krijgen
    const product = productId ? getProductById(productId as string) : undefined
    const courseIds = product?.metadata?.clickfunnels_course_ids || []

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
      stripeCustomerId: stripeCustomerId || (customer as string),
      hasEnrollment: false,
      courseIds: courseIds,
      enrolledCourses: [] as string[],
      failedCourses: [] as string[],
      error: null as string | null,
      invoiceUrl: null as string | null,
      invoicePdf: null as string | null,
    }

    // Haal factuurgegevens op als die beschikbaar zijn
    if (session.invoice) {
      try {
        const invoice = await stripe.invoices.retrieve(session.invoice as string)
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
          const invoiceItem = await stripe.invoiceItems.create({
            customer: customer as string,
            amount: session.amount_total || 0,
            currency: session.currency || "eur",
            description: `Betaling voor ${productName || "dienst"}`,
          })

          // Create and finalize invoice
          const invoice = await stripe.invoices.create({
            customer: customer as string,
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
            stripe_customer_id: stripeCustomerId || (customer as string) || "",
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
            hasEnrollment: enrollmentResult.enrolledCourses.length > 0,
            enrolledCourses: enrollmentResult.enrolledCourses,
            failedCourses: enrollmentResult.failedCourses,
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
