// Helper functies voor ClickFunnels die geen Server Actions zijn
// Dit bestand bevat geen 'use server' directive

import type { ClickfunnelsVariant, ClickfunnelsPrice } from "./clickfunnels"

/**
 * Controleert of een variant geldig is (niet verwijderd en heeft een prijs)
 * @param variant De variant om te controleren
 * @returns true als de variant geldig is, anders false
 */
export function isValidVariant(variant: ClickfunnelsVariant): boolean {
  // Controleer of de variant niet gearchiveerd of verwijderd is
  if (variant.archived === true || variant.deleted === true) {
    console.log(`Variant ${variant.id} is archived or deleted, skipping`)
    return false
  }

  // Controleer of de variant prijzen heeft
  if (!variant.price_ids || variant.price_ids.length === 0) {
    console.log(`Variant ${variant.id} has no price_ids, skipping`)
    return false
  }

  // Als de variant prices heeft, controleer dan of er geldige prijzen zijn
  if (variant.prices && variant.prices.length > 0) {
    const validPrices = variant.prices.filter(
      (price) =>
        price.archived !== true && price.deleted !== true && price.amount !== undefined && price.amount !== null,
    )

    if (validPrices.length === 0) {
      console.log(`Variant ${variant.id} has no valid prices, skipping`)
      return false
    }
  }

  return true
}

/**
 * Controleert of een prijs geldig is (niet verwijderd en heeft een bedrag)
 * @param price De prijs om te controleren
 * @returns true als de prijs geldig is, anders false
 */
export function isValidPrice(price: ClickfunnelsPrice): boolean {
  // Controleer of de prijs niet gearchiveerd of verwijderd is
  if (price.archived === true || price.deleted === true) {
    return false
  }

  // Controleer of de prijs een bedrag heeft
  if (price.amount === undefined || price.amount === null) {
    return false
  }

  return true
}
