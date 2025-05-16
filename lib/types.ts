export interface Product {
  id: string
  name: string
  description: string
  price: number
  features: string[]
  metadata?: Record<string, string>
}

export interface CustomerData {
  email: string
  firstName: string
  lastName: string
  phone?: string
  birthDate?: string
  companyDetails?: CompanyDetails
  productId: string
  productName: string
  membershipLevel?: string
  courseId?: string
}

export interface ClickFunnelsContact {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  custom_fields?: Record<string, string>
  tags?: string[]
  time_zone?: string
  fb_url?: string
  twitter_url?: string
  instagram_url?: string
  linkedin_url?: string
  website_url?: string
}

export interface ClickFunnelsEnrollment {
  contact_id: number
  course_id: number
  origination_source_type?: string
  origination_source_id?: number
}

export interface PaymentDetails {
  productId: string
  amount: number
  currency: string
  customerEmail: string
  customerName?: string
  metadata?: Record<string, string>
}

export interface CompanyDetails {
  name: string
  vatNumber?: string
  address?: string
  postalCode?: string
  city?: string
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
