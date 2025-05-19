export enum PaymentType {
  OneTime = "one_time",
  Subscription = "subscription",
  PaymentPlan = "payment_plan",
}

// Helper functie om betalingsplan details te formatteren
export function formatPaymentPlanDetails(price: any): string {
  if (!price || price.payment_type !== PaymentType.PaymentPlan) return ""

  const amount = Number.parseFloat(price.amount || "0")
  const duration = Number.parseInt(price.duration || "3", 10)
  const interval = price.interval || "month"
  const intervalCount = Number.parseInt(price.interval_count || "1", 10)

  let details = `${duration}x ${amount.toFixed(2)} (per ${interval || "month"})`
  if (intervalCount > 1) {
    details = `${duration}x ${amount.toFixed(2)} (elke ${intervalCount} ${interval || "month"}s)`
  }
  details += ` - Totaal: ${(amount * duration).toFixed(2)}`

  return details
}

// Helper functie om geldige prijzen te filteren
export function getValidPrices(prices: any[]): any[] {
  if (!prices || !Array.isArray(prices)) return []

  return prices.filter((price) => price && !price.archived)
}
