import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatteert een bedrag als valuta
 * @param amount Het bedrag om te formatteren
 * @param currency De valuta (standaard EUR)
 * @param locale De locale (standaard nl-NL)
 * @returns Geformatteerde valutastring
 */
export function formatCurrency(amount: number, currency = "EUR", locale = "nl-NL"): string {
  // Controleer of het bedrag al in centen is (kleine bedragen zoals 2.57 zijn waarschijnlijk in euro's)
  // Als het bedrag kleiner is dan 10, gaan we ervan uit dat het in euro's is en vermenigvuldigen we met 100
  const amountInCents = amount < 10 ? amount * 100 : amount

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInCents)
}
