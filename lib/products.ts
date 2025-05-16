import type { Product } from "./types"

export const products: Product[] = [
  {
    id: "coaching-basic",
    name: "Basis Coaching Pakket",
    description: "Persoonlijke coaching voor beginners",
    price: 9900, // €99.00
    features: ["3 coaching sessies", "Persoonlijk actieplan", "Email ondersteuning", "Toegang tot online materialen"],
    metadata: {
      clickfunnels_membership_level: "basic",
    },
  },
  {
    id: "coaching-premium",
    name: "Premium Coaching Pakket",
    description: "Uitgebreide coaching voor gevorderden",
    price: 19900, // €199.00
    features: [
      "6 coaching sessies",
      "Uitgebreid persoonlijk actieplan",
      "Onbeperkte email ondersteuning",
      "Volledige toegang tot online materialen",
      "Wekelijkse voortgangsrapportage",
    ],
    metadata: {
      clickfunnels_membership_level: "premium",
    },
  },
  {
    id: "coaching-vip",
    name: "VIP Coaching Pakket",
    description: "Exclusieve coaching voor professionals",
    price: 29900, // €299.00
    features: [
      "10 coaching sessies",
      "Volledig gepersonaliseerd actieplan",
      "24/7 ondersteuning",
      "Volledige toegang tot alle materialen",
      "Dagelijkse voortgangsrapportage",
      "Exclusieve VIP community toegang",
    ],
    metadata: {
      clickfunnels_membership_level: "vip",
    },
  },
  {
    id: "12-weken-vetverlies",
    name: "12-Weken Vetverlies Programma",
    description: "Compleet programma voor duurzaam vetverlies",
    price: 50, // €0.50 voor testen (normaal €497.00 = 49700)
    features: [
      "Gepersonaliseerd voedingsplan",
      "Wekelijkse trainingsschema's",
      "Toegang tot exclusieve video content",
      "Wekelijkse check-ins",
      "Ondersteuning via de community",
      "Levenslange toegang tot materialen",
    ],
    metadata: {
      clickfunnels_membership_level: "vetverlies",
      clickfunnels_course_id: "eWbLVk", // Bijgewerkt met de echte course ID
    },
  },
]

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id)
}
