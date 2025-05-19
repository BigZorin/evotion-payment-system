export enum PaymentType {
  OneTime = "one_time",
  Subscription = "subscription",
  PaymentPlan = "payment_plan",
}

export function getValidPrices(prices: any[]) {
  if (!prices || !Array.isArray(prices)) return []

  return prices.filter((price: any) => {
    if (!price) return false
    if (price.archived === true) return false
    if (price.deleted === true) return false
    return true
  })
}

export function isValidVariant(variant: any) {
  if (!variant) return false

  // Een variant is geldig als hij niet gearchiveerd is
  if (variant.archived) return false

  // Een variant moet ten minste één geldige prijs hebben
  const hasValidPrices =
    variant.prices && variant.prices.some((price: any) => price && !price.archived && price.visible)

  return hasValidPrices
}
