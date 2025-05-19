// This file contains helper functions that are NOT used as Server Actions
// and thus do not need to be async

// Betaaltype enum voor betere type veiligheid
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

  // Stripe geeft bedragen in centen, dus we moeten delen door 100
  // ClickFunnels API geeft prijzen als decimale getallen (bijv. "257.00" voor €257)
  // We delen alleen door 100 als het een Stripe bedrag is (meestal boven 1000)
  if (numericAmount > 1000 && currency === "EUR" && String(numericAmount).length > 5) {
    // Als het bedrag 1000 of hoger is en een Stripe bedrag lijkt te zijn (bijv. 25700 voor €257,00)
    numericAmount = numericAmount / 100
  }

  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)
}

// Helper function to get valid prices
export function getValidPrices(prices: any[] | undefined): any[] {
  if (!prices || !Array.isArray(prices)) return []

  return prices.filter((price) => isValidPrice(price))
}

// Helper function to check if a price is valid
export function isValidPrice(price: any): boolean {
  return price && !price.archived && price.visible
}

// Functie om betalingsplan details te formatteren
export function formatPaymentPlanDetails(price: any): string {
  if (!price || price.payment_type !== PaymentType.PaymentPlan) return ""

  // Log de prijs voor debugging
  console.log("Formatting payment plan details for price:", price)

  // Haal de benodigde gegevens op
  const amount = Number.parseFloat(price.amount || "0")
  const duration = Number.parseInt(price.duration || "3", 10)
  const interval = price.interval || "month"
  const intervalCount = Number.parseInt(price.interval_count || "1", 10)

  // Log de gegevens voor debugging
  console.log("Payment plan details:", {
    amount,
    duration,
    interval,
    intervalCount,
  })

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

// Helper functie om interval label te vertalen
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

// Voeg deze functie toe of update deze als hij al bestaat
export function isValidVariant(variant: any) {
  if (!variant) return false

  // Een variant is geldig als hij niet gearchiveerd is
  if (variant.archived) return false

  // Een variant moet ten minste één geldige prijs hebben
  const hasValidPrices =
    variant.prices && variant.prices.some((price: any) => price && !price.archived && price.visible)

  return hasValidPrices
}

/**
 * Formatteert een datum naar een leesbare notatie
 *
 * @param date De datum die geformatteerd moet worden
 * @returns Geformatteerde datum als string
 */
export function formatDate(date: Date): string {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === now.toDateString()) {
    return `Vandaag, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Gisteren, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  } else {
    return `${date.getDate()} ${["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"][date.getMonth()]}, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  }
}
