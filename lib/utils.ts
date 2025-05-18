import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatteert een bedrag als valuta
 * @param amount Het bedrag dat geformatteerd moet worden
 * @param currency De valuta (standaard EUR)
 * @returns Geformatteerd bedrag als string
 */
export function formatCurrency(amount: number | string | undefined, currency = "EUR"): string {
  if (amount === undefined || amount === null) {
    return "Prijs niet beschikbaar"
  }

  // Converteer naar nummer als het een string is
  const numericAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount

  if (isNaN(numericAmount)) {
    return "Ongeldige prijs"
  }

  // Detecteer of het bedrag in centen of euro's is
  // Als het bedrag kleiner is dan 10, gaan we ervan uit dat het in euro's is
  // Anders gaan we ervan uit dat het in centen is
  // Dit is een heuristiek die werkt voor de meeste gevallen
  const amountInEuros = numericAmount < 10 ? numericAmount : numericAmount / 100

  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInEuros)
}
