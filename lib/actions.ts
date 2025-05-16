"use server"
import Stripe from "stripe"
import { getProductById } from "./products"
import { createClickFunnelsContact, updateClickFunnelsContact, createCourseEnrollment } from "./clickfunnels"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

interface CreateCheckoutSessionParams {
  productId: string
  customerEmail: string
  customerName?: string
  customerPhone?: string
}

export async function createCheckoutSession({
  productId,
  customerEmail,
  customerName,
  customerPhone,
}: CreateCheckoutSessionParams) {
  const product = getProductById(productId)

  if (!product) {
    throw new Error("Product niet gevonden")
  }

  // Prepare customer data for ClickFunnels
  const customerData = {
    email: customerEmail,
    name: customerName,
    phone: customerPhone,
    productId: product.id,
    productName: product.name,
    membershipLevel: product.metadata?.clickfunnels_membership_level || "basic",
    courseId: product.metadata?.clickfunnels_course_id || "", // Voeg course ID toe aan metadata
  }

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

      // Optioneel: Update klantgegevens als ze zijn gewijzigd
      if (customerName || customerPhone) {
        await stripe.customers.update(customerId, {
          name: customerName || undefined,
          phone: customerPhone || undefined,
        })
        console.log(`Klantgegevens bijgewerkt voor: ${customerId}`)
      }
    } else {
      // Maak een nieuwe klant aan
      const newCustomer = await stripe.customers.create({
        email: customerEmail,
        name: customerName || undefined,
        phone: customerPhone || undefined,
        metadata: {
          source: "website_payment",
          productId: product.id,
          membershipLevel: product.metadata?.clickfunnels_membership_level || "basic",
        },
      })
      customerId = newCustomer.id
      console.log(`Nieuwe Stripe klant aangemaakt: ${customerId}`)
    }
  } catch (error) {
    console.error("Fout bij het aanmaken/ophalen van Stripe klant:", error)
    // We gaan door met de checkout zelfs als het aanmaken van de klant mislukt
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "ideal"],
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
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: customerId ? undefined : customerEmail, // Alleen gebruiken als we geen klant ID hebben
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/checkout/${productId}`,
    metadata: {
      ...customerData,
      stripeCustomerId: customerId, // Bewaar de klant ID in de metadata
    },
  })

  return { sessionId: session.id }
}

export async function handleSuccessfulPayment(sessionId: string) {
  console.log(`Processing successful payment for session: ${sessionId}`)

  try {
    // Retrieve the checkout session to get customer details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items", "customer"],
    })

    console.log(`Session payment status: ${session.payment_status}`)

    if (session.payment_status !== "paid") {
      console.log(`Payment not completed yet, status: ${session.payment_status}`)
      return {
        success: false,
        error: "Betaling is nog niet voltooid",
      }
    }

    // Haal klantgegevens op, eerst uit metadata, dan uit de klant object
    const stripeCustomer = session.customer as Stripe.Customer

    // Extract customer data from session metadata
    const { email, name, phone, productId, productName, membershipLevel, courseId } = session.metadata || {}

    // Gebruik klantgegevens uit Stripe als ze beschikbaar zijn
    const customerEmail = email || stripeCustomer?.email || session.customer_details?.email
    const customerName = name || stripeCustomer?.name || session.customer_details?.name
    const customerPhone = phone || stripeCustomer?.phone || session.customer_details?.phone

    console.log(`Customer data from metadata: email=${email}, name=${name}, phone=${phone}`)
    console.log(`Stripe customer data: email=${stripeCustomer?.email}, name=${stripeCustomer?.name}`)
    console.log(
      `Product data from metadata: id=${productId}, name=${productName}, level=${membershipLevel}, courseId=${courseId}`,
    )

    // Fallback to session data if metadata is incomplete
    if (!customerEmail) {
      console.error(`Missing email in session data`)
      return {
        success: false,
        error: "Klantgegevens ontbreken",
      }
    }

    console.log(`Final customer data: email=${customerEmail}, name=${customerName}, phone=${customerPhone}`)

    try {
      // Create contact in ClickFunnels
      console.log(`Creating Evotion account for ${customerEmail}...`)

      // Split name into first and last name
      let firstName = customerName
      let lastName = ""

      if (customerName && customerName.includes(" ")) {
        const nameParts = customerName.split(" ")
        firstName = nameParts[0]
        lastName = nameParts.slice(1).join(" ")
      }

      // Get payment amount from session
      const amountTotal = session.amount_total
      const currency = session.currency
      const formattedAmount = amountTotal
        ? new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amountTotal / 100)
        : "onbekend"

      // Get payment date
      const paymentDate = new Date().toISOString()

      // Probeer eerst een bestaand contact bij te werken
      let contactId: number | undefined
      let enrollmentResult: any = { success: false }
      let hasEnrollment = false

      try {
        const updateResult = await updateClickFunnelsContact({
          email: customerEmail,
          first_name: firstName,
          last_name: lastName,
          phone: customerPhone,
          tags: [membershipLevel || "basic", "stripe-customer", "paid-customer"],
          custom_fields: {
            product_id: productId || "",
            product_name: productName || "",
            membership_level: membershipLevel || "basic",
            payment_amount: formattedAmount,
            payment_date: paymentDate,
            payment_method: "Stripe",
            stripe_session_id: sessionId,
            stripe_customer_id: stripeCustomer?.id || "",
            source: "website_payment",
          },
        })

        if (updateResult.success) {
          console.log(`Evotion account bijgewerkt:`, updateResult.data)
          contactId = updateResult.contactId
        } else {
          // Als bijwerken mislukt, maak een nieuw contact aan
          console.log(`Geen bestaand account gevonden, nieuw Evotion account aanmaken...`)
          const createResult = await createClickFunnelsContact({
            email: customerEmail,
            first_name: firstName,
            last_name: lastName,
            phone: customerPhone,
            tags: [membershipLevel || "basic", "stripe-customer", "paid-customer"],
            custom_fields: {
              product_id: productId || "",
              product_name: productName || "",
              membership_level: membershipLevel || "basic",
              payment_amount: formattedAmount,
              payment_date: paymentDate,
              payment_method: "Stripe",
              stripe_session_id: sessionId,
              stripe_customer_id: stripeCustomer?.id || "",
              source: "website_payment",
            },
          })
          console.log(`Evotion account aangemaakt:`, createResult)
          contactId = createResult.data?.id
        }

        // Als er een course ID is en een contact ID, schrijf de klant in voor de cursus
        if (courseId && contactId) {
          console.log(`Enrolling contact ${contactId} in course ${courseId}...`)
          enrollmentResult = await createCourseEnrollment({
            contact_id: contactId,
            course_id: Number.parseInt(courseId),
            origination_source_type: "stripe_payment",
            origination_source_id: 1,
          })

          if (enrollmentResult.success) {
            console.log(`Successfully enrolled contact in course:`, enrollmentResult.data)
            hasEnrollment = true
          } else {
            console.error(`Failed to enroll contact in course:`, enrollmentResult.error)
          }
        }
      } catch (error) {
        console.error("Error updating/creating Evotion account or enrollment:", error)
        throw error
      }

      return {
        success: true,
        customerEmail,
        customerName,
        productName: productName || "dienst",
        stripeCustomerId: stripeCustomer?.id,
        hasEnrollment,
        courseId: courseId || undefined,
      }
    } catch (error) {
      console.error("Error creating Evotion account:", error)

      // Return partial success to show a friendly message to the customer
      // even though the ClickFunnels account creation failed
      return {
        success: false,
        partialSuccess: true,
        customerEmail,
        error:
          "Je betaling is geslaagd, maar er is een probleem opgetreden bij het aanmaken van je account. Ons team zal contact met je opnemen om dit op te lossen.",
      }
    }
  } catch (error) {
    console.error("Error handling successful payment:", error)
    return {
      success: false,
      error: "Er is een fout opgetreden bij het verwerken van je betaling. Neem contact op met onze klantenservice.",
    }
  }
}
