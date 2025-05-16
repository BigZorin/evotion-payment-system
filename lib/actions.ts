"use server"
import Stripe from "stripe"
import { getProductById } from "./products"
import { createClickFunnelsContact } from "./clickfunnels"

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
  }

  // Create Stripe checkout session
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
    customer_email: customerEmail,
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/checkout/${productId}`,
    metadata: {
      ...customerData,
    },
  })

  return { sessionId: session.id }
}

export async function handleSuccessfulPayment(sessionId: string) {
  try {
    // Retrieve the checkout session to get customer details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    })

    if (session.payment_status !== "paid") {
      throw new Error("Betaling is nog niet voltooid")
    }

    // Extract customer data from session metadata
    const { email, name, phone, productId, productName, membershipLevel } = session.metadata || {}

    if (!email) {
      throw new Error("Klantgegevens ontbreken")
    }

    // Create contact in ClickFunnels
    await createClickFunnelsContact({
      email,
      first_name: name?.split(" ")[0],
      last_name: name?.split(" ").slice(1).join(" "),
      phone,
      custom_fields: {
        product_id: productId || "",
        product_name: productName || "",
        membership_level: membershipLevel || "basic",
      },
    })

    return { success: true, customerEmail: email }
  } catch (error) {
    console.error("Error handling successful payment:", error)
    return { success: false, error: "Er is een fout opgetreden bij het verwerken van je betaling" }
  }
}
