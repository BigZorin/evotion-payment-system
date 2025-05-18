import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
 * Formatteert een prijs voor weergave, met speciale behandeling voor gratis items
 *
 * @param amount Het bedrag dat geformatteerd moet worden
 * @param currency De valuta (standaard EUR)
 * @returns Geformatteerd bedrag als string, of "Gratis" als het bedrag 0 is
 */
export function formatPrice(amount: string | number | undefined | null, currency = "EUR"): string {
  if (amount === undefined || amount === null) {
    return "Prijs niet beschikbaar"
  }

  // Converteer naar nummer
  let numericAmount: number

  if (typeof amount === "string") {
    const normalizedAmount = amount.replace(",", ".")
    numericAmount = Number.parseFloat(normalizedAmount)
  } else {
    numericAmount = amount
  }

  if (isNaN(numericAmount)) {
    return "Ongeldige prijs"
  }

  // Als het bedrag 0 is, toon "Gratis"
  if (numericAmount === 0) {
    return "Gratis"
  }

  // Anders, gebruik de normale formatCurrency functie
  return formatCurrency(numericAmount, currency)
}
