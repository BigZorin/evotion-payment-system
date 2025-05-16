export interface Product {
  id: string
  name: string
  description: string
  price: number
  features: string[]
  metadata?: Record<string, string>
}

export interface ClickFunnelsContact {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  custom_fields?: Record<string, string>;
  tags?: string[];  // Toegevoegd voor ondersteuning van tags
  time_zone?: string;  // Toegevoegd voor tijdzone ondersteuning
  fb_url?: string;  // Toegevoegd voor sociale media
  twitter_url?: string;  // Toegevoegd voor sociale media
  instagram_url?: string;  // Toegevoegd voor sociale media
  linkedin_url?: string;  // Toegevoegd voor sociale media
  website_url?: string;  // Toegevoegd voor website
}

export interface PaymentDetails {
  productId: string
  amount: number
  currency: string
  customerEmail: string
  customerName?: string
  metadata?: Record<string, string>
}

export interface StripeCheckoutOptions {
  payment_method_types: string[]
  line_items: Array<{
    price_data: {
      currency: string
      product_data: {
        name: string
        description?: string
        metadata?: Record<string, string>
      }
      unit_amount: number
    }
    quantity: number
  }>
  customer_email?: string
  mode: "payment"
  success_url: string
  cancel_url: string
  metadata?: Record<string, string>
}
