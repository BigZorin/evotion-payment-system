// In app/api/webhooks/stripe/route.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") as string;

    console.log("Webhook received, verifying signature...");
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`Webhook verified: ${event.type}, id: ${event.id}`);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      try {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Processing checkout session: ${session.id}`);
        console.log(`Payment status: ${session.payment_status}`);
        console.log(`Metadata:`, session.metadata);

        // Only process if payment is successful
        if (session.payment_status === "paid") {
          // Extract customer data from session metadata
          const { email, name, phone, productId, productName, membershipLevel } = session.metadata || {};
          console.log(`Customer data: email=${email}, name=${name}, phone=${phone}`);
          console.log(`Product data: id=${productId}, name=${productName}, level=${membershipLevel}`);

          if (email) {
            try {
              // Create contact in ClickFunnels
              console.log(`Creating ClickFunnels contact for ${email}...`);
              const clickfunnelsResponse = await createClickFunnelsContact({
                email,
                first_name: name?.split(" ")[0],
                last_name: name?.split(" ").slice(1).join(" "),
                phone,
                custom_fields: {
                  product_id: productId || "",
                  product_name: productName || "",
                  membership_level: membershipLevel || "basic",
                },
                tags: [membershipLevel || "basic", "stripe-customer"]
              });
              console.log(`ClickFunnels response:`, clickfunnelsResponse);
              console.log(`Successfully created ClickFunnels contact for ${email}`);
            } catch (error) {
              // Log de fout maar laat de webhook succesvol voltooien
              console.error(`Error creating ClickFunnels contact:`, error);
              // Stuur een 200 OK terug naar Stripe om te voorkomen dat ze blijven proberen
              return NextResponse.json({ 
                received: true, 
                warning: "Webhook processed but ClickFunnels contact creation failed" 
              });
            }
          } else {
            console.error(`Missing email in session metadata`);
            return NextResponse.json({ 
              received: true, 
              warning: "Webhook processed but email was missing in metadata" 
            });
          }
        } else {
          console.log(`Payment not completed yet, status: ${session.payment_status}`);
        }
      } catch (error) {
        console.error("Error processing checkout.session.completed:", error);
        // Stuur een 200 OK terug naar Stripe om te voorkomen dat ze blijven proberen
        return NextResponse.json({ 
          received: true, 
          warning: "Webhook received but processing failed" 
        });
      }
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // Stuur een 500 error terug zodat Stripe het opnieuw probeert
    return NextResponse.json({ error: "Webhook handler failed", details: String(error) }, { status: 500 });
  }
}