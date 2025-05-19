export enum PaymentType {
  OneTime = "one_time",
  Subscription = "subscription",
  PaymentPlan = "payment_plan",
}

/**
 * Formats a currency amount in cents to a readable string with euro symbol
 * @param amount The amount in cents
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string | undefined | null, currency = "EUR"): string {
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

  // Convert cents to euros
  const euros = numericAmount / 100

  // Format with euro symbol and two decimal places
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros)
}

/**
 * Formats a date to a readable string
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  // Check if the date is today
  const today = new Date()
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  if (isToday) {
    // Format as "Vandaag, HH:MM"
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `Vandaag, ${hours}:${minutes}`
  } else {
    // Format as "DD-MM-YYYY, HH:MM"
    return new Intl.DateTimeFormat("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date)
  }
}

// Helper function to get valid prices
export function getValidPrices(prices: any[]) {
  if (!prices) return []

  return prices.filter((price: any) => price && !price.archived)
}

// Helper function to get interval label
function getIntervalLabel(interval: string, count = 1): string {
  const intervalMap: Record<string, [string, string]> = {
    day: ["dag", "dagen"],
    week: ["week", "weken"],
    month: ["maand", "maanden"],
    year: ["jaar", "jaar"],
  }

  const [singular, plural] = intervalMap[interval?.toLowerCase()] || ["periode", "periodes"]
  return count === 1 ? singular : plural
}

// Helper function to format payment plan details
export function formatPaymentPlanDetails(price: any): string {
  if (!price || price.payment_type !== PaymentType.PaymentPlan) return ""

  // Haal de benodigde gegevens op
  const amount = Number.parseFloat(price.amount || "0")
  const duration = Number.parseInt(price.duration || "3", 10)
  const interval = price.interval || "month"
  const intervalCount = Number.parseInt(price.interval_count || "1", 10)

  // Formateer het bedrag
  const formattedAmount = formatCurrency(amount, price.currency)

  // Bereken het totaalbedrag (elke termijn is het volledige bedrag)
  const totalAmount = amount * duration
  const formattedTotalAmount = formatCurrency(totalAmount, price.currency)

  // Bepaal de juiste intervaltekst
  const intervalLabel = getIntervalLabel(interval, intervalCount)

  // Bouw de betalingsplan details string
  let details = `${duration}x ${formattedAmount}`
  if (intervalCount === 1) {
    details += ` (per ${intervalLabel})`
  } else {
    details += ` (elke ${intervalCount} ${intervalLabel})`
  }

  // Voeg het totaalbedrag toe
  details += ` - Totaal: ${formattedTotalAmount}`

  return details
}
