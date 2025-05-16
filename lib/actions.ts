"use server"

import Stripe from "stripe"
import { createClickFunnelsContact } from "./clickfunnels"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function handleSuccessfulPayment(sessionId: string) {
  console.log(`Processing successful payment for session: ${sessionId}`);
  
  try {
    // Retrieve the checkout session to get customer details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    })

    console.log(`Session payment status: ${session.payment_status}`);
    
    if (session.payment_status !== "paid") {
      console.log(`Payment not completed yet, status: ${session.payment_status}`);
      return { 
        success: false, 
        error: "Betaling is nog niet voltooid" 
      };
    }

    // Extract customer data from session metadata
    const { email, name, phone, productId, productName, membershipLevel } = session.metadata || {};
    
    console.log(`Customer data from metadata: email=${email}, name=${name}, phone=${phone}`);
    console.log(`Product data from metadata: id=${productId}, name=${productName}, level=${membershipLevel}`);

    // Fallback to session data if metadata is incomplete
    const customerEmail = email || session.customer_details?.email;
    const customerName = name || session.customer_details?.name;
    const customerPhone = phone || session.customer_details?.phone;

    if (!customerEmail) {
      console.error(`Missing email in session data`);
      return { 
        success: false, 
        error: "Klantgegevens ontbreken" 
      };
    }

    console.log(`Final customer data: email=${customerEmail}, name=${customerName}, phone=${customerPhone}`);

    try {
      // Create contact in ClickFunnels
      console.log(`Creating ClickFunnels contact for ${customerEmail}...`);
      
      // Split name into first and last name
      let firstName = customerName;
      let lastName = "";
      
      if (customerName && customerName.includes(" ")) {
        const nameParts = customerName.split(" ");
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(" ");
      }
      
      // Get payment amount from session
      const amountTotal = session.amount_total;
      const currency = session.currency;
      const formattedAmount = amountTotal ? 
        new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(amountTotal / 100) : 
        "onbekend";
      
      // Get payment date
      const paymentDate = new Date().toISOString();
      
      // Create the contact with enhanced data
      const clickfunnelsResponse = await createClickFunnelsContact({
        email: customerEmail,
        first_name: firstName,
        last_name: lastName,
        phone: customerPhone,
        tags: [
          membershipLevel || "basic", 
          "stripe-customer",
          "paid-customer"
        ],
        custom_fields: {
          product_id: productId || "",
          product_name: productName || "",
          membership_level: membershipLevel || "basic",
          payment_amount: formattedAmount,
          payment_date: paymentDate,
          payment_method: "Stripe",
          stripe_session_id: sessionId,
          source: "website_payment"
        }
      });
      
      console.log(`ClickFunnels contact created successfully:`, clickfunnelsResponse);

      return { 
        success: true, 
        customerEmail,
        customerName,
        productName: productName || "dienst"
      };
    } catch (error) {
      console.error("Error creating ClickFunnels contact:", error);
      
      // Return partial success to show a friendly message to the customer
      // even though the ClickFunnels account creation failed
      return { 
        success: false, 
        partialSuccess: true,
        customerEmail,
        error: "Je betaling is geslaagd, maar er is een probleem opgetreden bij het aanmaken van je account. Ons team zal contact met je opnemen om dit op te lossen." 
      };
    }
  } catch (error) {
    console.error("Error handling successful payment:", error);
    return { 
      success: false, 
      error: "Er is een fout opgetreden bij het verwerken van je betaling. Neem contact op met onze klantenservice." 
    };
  }
}