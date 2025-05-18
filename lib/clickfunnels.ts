"\"use server"

export interface ClickfunnelsProduct {
  id: number
  public_id: string | null
  name: string
  description: string
  current_path: string | null
  archived: boolean | null
  visible_in_store: boolean | null
  visible_in_customer_center: boolean | null
  image_id: string | null
  seo_title: string | null
  seo_description: string | null
  default_variant_id: number
  created_at: string | null
  updated_at: string | null
  variant_properties: Array<{
    id: number
    name: string
  }> | null
  price_ids: number[] | null
  variant_ids: string[]
  // Toegevoegde velden voor prijsinformatie
  variant?: ClickfunnelsVariant
  variants?: ClickfunnelsVariant[]
  prices?: ClickfunnelsPrice[]
  defaultPrice?: ClickfunnelsPrice
}

export interface ClickfunnelsVariant {
  id: number
  public_id?: string
  product_id?: number
  name: string
  description: string | null
  sku: string | null
  price_ids: string[] | null
  prices?: ClickfunnelsPrice[]
  archived?: boolean
  deleted?: boolean
  properties_values?: {
    property_id: number
    value: string
  }[]
  // ... other properties
}

export interface ClickfunnelsPrice {
  id: number
  public_id?: string
  variant_id?: number
  amount: number
  currency: string
  recurring: boolean
  recurring_interval?: string
  recurring_interval_count?: number
  archived?: boolean
  deleted?: boolean
  // ... other properties
}
\
"
