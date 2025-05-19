export enum PaymentType {
  OneTime = "one_time",
  Subscription = "subscription",
  PaymentPlan = "payment_plan",
}

/**
 * Formatteert een bedrag naar een leesbare valutanotatie
 *
 * @param amount Het bedrag dat geformatteerd moet worden (kan een string of number zijn)
 * @param currency De valuta (standaard EUR)
 * @returns Geformatteerd bedrag als string
 */
export function formatCurrency(amount: string | number | undefined | null, currency = "EUR"): string {
  if (amount === undefined || amount === null) {
    return "Prijs niet beschikbaar"
  }

  // Converteer naar nummer als het een string is
  let numericAmount: number

  if (typeof amount === "string") {
    // Vervang komma's door punten voor consistente parsing
    const normalizedAmount = amount.replace(",", ".")
    numericAmount = Number.parseFloat(normalizedAmount)
  } else {
    numericAmount = amount
  }

  if (isNaN(numericAmount)) {
    return "Ongeldige prijs"
  }

  // ClickFunnels API geeft prijzen als decimale getallen (bijv. "257.00" voor €257)
  // We hoeven dus NIET te delen door 100

  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)
}

/**
 * Formatteert de details van een betalingsplan
 * @param price Het prijs object
 * @returns Een string met de geformatteerde details
 */
export function formatPaymentPlanDetails(price: any): string {
  if (!price || price.payment_type !== PaymentType.PaymentPlan) return ""

  const amount = Number.parseFloat(price.amount || "0")
  const duration = Number.parseInt(price.duration || "3", 10)
  const interval = price.interval || "month"
  const intervalCount = Number.parseInt(price.interval_count || "1", 10)

  const formattedAmount = formatCurrency(amount, price.currency)

  let details = `${duration} x ${formattedAmount} per ${interval}`

  if (intervalCount > 1) {
    details += ` (elke ${intervalCount} ${interval}en)`
  }

  return details
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
