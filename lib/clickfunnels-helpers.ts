// Voeg deze code toe aan het bestaande bestand, of vervang het indien nodig

// Betaaltype enum voor betere type veiligheid
export enum PaymentType {
  OneTime = "one_time",
  Subscription = "subscription",
  PaymentPlan = "payment_plan",
}

// Functie om te controleren of een prijs geldig is (niet gearchiveerd en zichtbaar)
export function isValidPrice(price: any): boolean {
  return price && price.archived !== true && price.visible !== false
}

// Functie om alleen geldige prijzen te filteren
export function getValidPrices(prices: any[]): any[] {
  if (!Array.isArray(prices)) return []
  return prices.filter(isValidPrice)
}

// Functie om het label voor een betaaltype te krijgen
export function getPaymentTypeLabel(paymentType: string): string {
  switch (paymentType) {
    case PaymentType.OneTime:
      return "Eenmalige betaling"
    case PaymentType.Subscription:
      return "Abonnement"
    case PaymentType.PaymentPlan:
      return "Betalingsplan"
    default:
      return "Onbekend"
  }
}

// Functie om de details van een abonnement te formatteren
export function formatSubscriptionDetails(price: any): string {
  if (!price) return ""

  const interval = price.recurring_interval || price.interval || "month"
  const intervalCount = price.recurring_interval_count || price.interval_count || 1

  // Vertaal interval naar Nederlands
  const intervalMap: Record<string, [string, string]> = {
    day: ["dag", "dagen"],
    week: ["week", "weken"],
    month: ["maand", "maanden"],
    year: ["jaar", "jaar"],
  }

  const [singular, plural] = intervalMap[interval] || ["periode", "periodes"]
  const intervalText = intervalCount === 1 ? singular : plural

  return `${intervalCount === 1 ? "Per" : `Elke ${intervalCount}`} ${intervalText}`
}

// Functie om de details van een betalingsplan te formatteren
export function formatPaymentPlanDetails(price: any): string {
  if (!price) return ""

  // Haal de benodigde gegevens op
  const amount = Number.parseFloat(price.amount || "0")
  const installmentsCount = Number.parseInt(price.installments_count || price.duration || "3", 10)
  const interval = price.interval || "month"
  const intervalCount = Number.parseInt(price.interval_count || "1", 10)

  // Vertaal interval naar Nederlands
  const intervalMap: Record<string, [string, string]> = {
    day: ["dag", "dagen"],
    week: ["week", "weken"],
    month: ["maand", "maanden"],
    year: ["jaar", "jaar"],
  }

  const [singular, plural] = intervalMap[interval] || ["periode", "periodes"]
  const intervalText = intervalCount === 1 ? singular : plural

  // Formateer het bedrag
  const formattedAmount = formatCurrency(amount)

  // Bereken het totaalbedrag (elke termijn is het volledige bedrag)
  const totalAmount = amount * installmentsCount
  const formattedTotalAmount = formatCurrency(totalAmount)

  // Bouw de betalingsplan details string
  let details = `${installmentsCount}x ${formattedAmount}`
  if (intervalCount === 1) {
    details += ` (per ${intervalText})`
  } else {
    details += ` (elke ${intervalCount} ${intervalText})`
  }

  // Voeg het totaalbedrag toe
  details += ` - Totaal: ${formattedTotalAmount}`

  return details
}

// Functie om valuta te formatteren
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

  // ClickFunnels API geeft prijzen als decimale getallen (bijv. "257.00" voor €257)
  // We hoeven dus NIET te delen door 100
  // Verwijder de code die bedragen boven 1000 deelt door 100

  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)
}

// Functie om te controleren of een variant geldig is
export function isValidVariant(variant: any): boolean {
  return variant && variant.archived !== true && variant.visible !== false
}

// Functie om de details van een betalingsplan te krijgen
export function getPaymentPlanDetails(price: any): {
  installmentsCount: number
  installmentAmount: number
  interval: string
  intervalCount: number
  totalAmount: number
} {
  if (!price)
    return {
      installmentsCount: 0,
      installmentAmount: 0,
      interval: "month",
      intervalCount: 1,
      totalAmount: 0,
    }

  // Haal de benodigde gegevens op
  const amount = Number.parseFloat(price.amount || "0")
  const installmentsCount = Number.parseInt(price.installments_count || price.duration || "3", 10)
  const interval = price.interval || "month"
  const intervalCount = Number.parseInt(price.interval_count || "1", 10)

  // Het bedrag per termijn is het volledige bedrag (niet gedeeld door het aantal termijnen)
  const installmentAmount = amount

  // Het totaalbedrag is het bedrag per termijn vermenigvuldigd met het aantal termijnen
  const totalAmount = amount * installmentsCount

  return {
    installmentsCount,
    installmentAmount,
    interval,
    intervalCount,
    totalAmount,
  }
}
