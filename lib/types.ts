export interface Product {
  id: string
  name: string
  description: string
  price: number
  features: string[]
  metadata?: {
    clickfunnels_membership_level?: string
    clickfunnels_course_ids?: string[] // Array van course IDs
    kahunas_package?: string
    [key: string]: any
  }
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
  phone?: string // We'll keep this in the type but not use it in API calls
  time_zone?: string
  fb_url?: string
  twitter_url?: string
  instagram_url?: string
  linkedin_url?: string
  website_url?: string
  custom_fields?: Record<string, string>
  tags?: string[]
}

export interface ClickFunnelsEnrollment {
  contact_id: number
  course_id: number | string // Updated to accept both number and string
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
