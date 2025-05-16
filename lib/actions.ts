"use server"
import Stripe from "stripe"
import { getProductById } from "./products"
import {
  createClickFunnelsContact,
  updateClickFunnelsContact,
  createCourseEnrollment,
  getContactEnrollments,
} from "./clickfunnels"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

interface CompanyDetails {
  name: string
  vatNumber?: string
  address?: string
  postalCode?: string
  city?: string
}

interface CreateCheckoutSessionParams {
  productId: string
  customerEmail: string
  customerFirstName: string
  customerLastName: string
  customerPhone?: string
  customerBirthDate?: string
  companyDetails?: CompanyDetails
}

export async function createCheckoutSession({
  productId,
  customerEmail,
  customerFirstName,
  customerLastName,
  customerPhone,
  customerBirthDate,
  companyDetails,
}: CreateCheckoutSessionParams) {
  try {
    console.log("Starting checkout session creation with params:", {
      productId,
      customerEmail,
      customerFirstName,
      customerLastName,
      customerPhone,
      customerBirthDate,
      companyDetails: companyDetails ? "Present" : "Not present",
    })

    const product = getProductById(productId)

    if (!product) {
      console.error(`Product niet gevonden: ${productId}`)
      throw new Error("Product niet gevonden")
    }

    console.log(`Product gevonden: ${product.name}, prijs: ${product.price}`)

    // Controleer of de prijs niet te laag is (minimaal 50 cent voor Stripe)
    if (product.price < 50) {
      console.log("Prijs aangepast naar minimaal 50 cent voor Stripe")
      product.price = 50 // Minimaal 50 cent voor Stripe
    }

    const customerName = `${customerFirstName} ${customerLastName}`.trim()

    // Prepare customer data for ClickFunnels
    const customerData = {
      email: customerEmail,
      firstName: customerFirstName,
      lastName: customerLastName,
      phone: customerPhone || "",
      birthDate: customerBirthDate || "",
      productId: product.id,
      productName: product.name,
      membershipLevel: product.metadata?.clickfunnels_membership_level || "basic",
      courseId: product.metadata?.clickfunnels_course_id || "",
      // Voeg hier eventueel een veld toe voor het Kahunas package
      kahunasPackage: product.metadata?.kahunas_package || product.id,
    }

    console.log("Customer data prepared:", customerData)

    // Zoek bestaande klant of maak een nieuwe aan
    let customerId: string | undefined

    try {
      // Zoek eerst of de klant al bestaat in Stripe
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      })

      if (customers.data.length > 0) {
        // Gebruik bestaande klant
        customerId = customers.data[0].id
        console.log(`Bestaande Stripe klant gevonden: ${customerId}`)

        // Update klantgegevens
        await stripe.customers.update(customerId, {
          name: customerName,
          phone: customerPhone || undefined,
          metadata: {
            first_name: customerFirstName,
            last_name: customerLastName,
            birth_date: customerBirthDate || "",
            source: "website_payment",
            productId: product.id,
            productName: product.name,
            membershipLevel: product.metadata?.clickfunnels_membership_level || "basic",
            courseId: product.metadata?.clickfunnels_course_id || "",
            kahunasPackage: product.metadata?.kahunas_package || product.id,
          },
        })
        console.log(`Klantgegevens bijgewerkt voor: ${customerId}`)
      } else {
        // Maak een nieuwe klant aan
        const newCustomer = await stripe.customers.create({
          email: customerEmail,
          name: customerName,
          phone: customerPhone || undefined,
          metadata: {
            first_name: customerFirstName,
            last_name: customerLastName,
            birth_date: customerBirthDate || "",
            source: "website_payment",
            productId: product.id,
            productName: product.name,
            membershipLevel: product.metadata?.clickfunnels_membership_level || "basic",
            courseId: product.metadata?.clickfunnels_course_id || "",
            kahunasPackage: product.metadata?.kahunas_package || product.id,
          },
        })
        customerId = newCustomer.id
        console.log(`Nieuwe Stripe klant aangemaakt: ${customerId}`)
      }
    } catch (error) {
      console.error("Fout bij het aanmaken/ophalen van Stripe klant:", error)
      // We gaan door met de checkout zelfs als het aanmaken van de klant mislukt
    }

    // Als er bedrijfsgegevens zijn, voeg deze toe aan de klant en metadata
    if (companyDetails) {
      // Voeg bedrijfsgegevens toe aan de klant
      if (customerId) {
        await stripe.customers.update(customerId, {
          name: companyDetails.name, // Gebruik bedrijfsnaam als klantnaam
          metadata: {
            first_name: customerFirstName,
            last_name: customerLastName,
            birth_date: customerBirthDate || "",
            company_name: companyDetails.name,
            vat_number: companyDetails.vatNumber || "",
            address: companyDetails.address || "",
            postal_code: companyDetails.postalCode || "",
            city: companyDetails.city || "",
            is_company: "true",
            productId: product.id,
            productName: product.name,
            membershipLevel: product.metadata?.clickfunnels_membership_level || "basic",
            courseId: product.metadata?.clickfunnels_course_id || "",
            kahunasPackage: product.metadata?.kahunas_package || product.id,
          },
        })
      }

      // Voeg bedrijfsgegevens toe aan de customerData
      customerData.companyName = companyDetails.name
      customerData.vatNumber = companyDetails.vatNumber || ""
      customerData.address = companyDetails.address || ""
      customerData.postalCode = companyDetails.postalCode || ""
      customerData.city = companyDetails.city || ""
      customerData.isCompany = "true"
    }

    // Definieer alleen de betaalmethoden die we willen ondersteunen: iDEAL en card
    // iDEAL staat vooraan zodat het als eerste wordt getoond
    const paymentMethodTypes = ["ideal", "card"]

    console.log("Creating Stripe checkout session...")

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes,
      customer: customerId, // Gebruik de klant ID als we die hebben
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: product.name,
              description: product.description,
              metadata: {
                productId: product.id,
                ...product.metadata,
              },
            },
            unit_amount: product.price,
            tax_behavior: "inclusive", // BTW is inbegrepen in de prijs
          },
          quantity: 1,
        },
      ],
      // Schakel automatische belastingberekening in
      automatic_tax: {
        enabled: true,
      },
      // Voeg customer_update toe om het adres op te slaan bij de klant
      customer_update: {
        address: "auto",
        name: "auto",
      },
      mode: "payment",
      customer_email: customerId ? undefined : customerEmail, // Alleen gebruiken als we geen klant ID hebben
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://betalen.evotion-coaching.nl"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://betalen.evotion-coaching.nl"}/checkout/${productId}`,
      metadata: {
        email: customerEmail,
        first_name: customerFirstName,
        last_name: customerLastName,
        name: customerName,
        phone: customerPhone || "",
        birth_date: customerBirthDate || "",
        productId: product.id,
        productName: product.name,
        membershipLevel: product.metadata?.clickfunnels_membership_level || "basic",
        courseId: product.metadata?.clickfunnels_course_id || "",
        kahunasPackage: product.metadata?.kahunas_package || product.id,
        stripeCustomerId: customerId, // Bewaar de klant ID in de metadata
      },
      // Factuurgegevens inschakelen
      invoice_creation: {
        enabled: true,
      },
      // Optioneel: Voeg bedrijfsgegevens toe aan de factuur
      payment_intent_data: {
        metadata: {
          product_name: product.name,
          product_id: product.id,
          customer_email: customerEmail,
          customer_name: customerName,
          kahunas_package: product.metadata?.kahunas_package || product.id,
        },
      },
      // Locale instellen op Nederlands
      locale: "nl",
      // Verzendadres uitschakelen (niet nodig voor digitale producten)
      shipping_address_collection: undefined,
      // Telefoon uitschakelen (we hebben het al verzameld)
      phone_number_collection: {
        enabled: false,
      },
      // Adres verzamelen voor belastingberekening
      billing_address_collection: "required",
    })

    console.log(`Checkout session created: ${session.id}`)
    return { sessionId: session.id }
  } catch (error) {
    console.error("Error in createCheckoutSession:", error)
    throw error // Re-throw the error to be handled by the client
  }
}

// Rest of the code remains the same...
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
    const { customer_email: customerEmail, metadata, customer } = session

    const {
      first_name: firstName,
      last_name: lastName,
      name: customerName,
      phone,
      birth_date: birthDate,
      productId,
      productName,
      courseId,
      kahunasPackage,
      stripeCustomerId,
    } = metadata || {}

    // Basis response
    let response = {
      success: true,
      partialSuccess: false,
      customerEmail: customerEmail as string,
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
      courseId: courseId as string,
      error: null as string | null,
    }

    // Probeer het Evotion account aan te maken/bij te werken en de gebruiker in te schrijven voor de cursus
    try {
      // Get payment amount from session
      const amountTotal = session.amount_total
      const currency = session.currency
      const formattedAmount = amountTotal
        ? new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amountTotal / 100)
        : "onbekend"

      // Probeer eerst een bestaand contact bij te werken
      let contactId: number | undefined
      let enrollmentResult: any = { success: false }

      try {
        const updateResult = await updateClickFunnelsContact({
          email: customerEmail as string,
          first_name: firstName as string,
          last_name: lastName as string,
          phone: phone as string,
          tags: [metadata?.membershipLevel || "basic", "stripe-customer", "paid-customer"],
          custom_fields: {
            product_id: productId || "",
            product_name: productName || "",
            membership_level: metadata?.membershipLevel || "basic",
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

        if (updateResult.success) {
          console.log(`Evotion account bijgewerkt:`, updateResult.data)
          contactId = updateResult.contactId
        } else {
          // Als bijwerken mislukt, maak een nieuw contact aan
          console.log(`Geen bestaand account gevonden, nieuw Evotion account aanmaken...`)
          const createResult = await createClickFunnelsContact({
            email: customerEmail as string,
            first_name: firstName as string,
            last_name: lastName as string,
            phone: phone as string,
            tags: [metadata?.membershipLevel || "basic", "stripe-customer", "paid-customer"],
            custom_fields: {
              product_id: productId || "",
              product_name: productName || "",
              membership_level: metadata?.membershipLevel || "basic",
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
          console.log(`Evotion account aangemaakt:`, createResult)
          contactId = createResult.data?.id
        }

        // Als er een course ID is en een contact ID, schrijf de klant in voor de cursus
        if (courseId && contactId) {
          console.log(`Enrolling contact ${contactId} in course ${courseId}...`)

          // Check if the contact is already enrolled in the course
          const existingEnrollments = await getContactEnrollments(contactId, Number.parseInt(courseId))

          if (existingEnrollments.success && existingEnrollments.data.courses_enrollments.length > 0) {
            console.log(`Contact ${contactId} is already enrolled in course ${courseId}. Skipping enrollment.`)
            response = { ...response, hasEnrollment: true }
          } else {
            enrollmentResult = await createCourseEnrollment({
              contact_id: contactId,
              course_id: Number.parseInt(courseId),
              origination_source_type: "stripe_checkout",
              origination_source_id: 1,
            })

            if (enrollmentResult.success) {
              console.log(`Successfully enrolled contact in course:`, enrollmentResult.data)
              response = { ...response, hasEnrollment: true }
            } else {
              console.error(`Failed to enroll contact in course:`, enrollmentResult.error)
              response = { ...response, hasEnrollment: false }
            }
          }
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
