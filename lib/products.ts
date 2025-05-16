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
      kahunas_package: "basic-coaching", // Specifiek Kahunas package ID
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
      kahunas_package: "premium-coaching", // Specifiek Kahunas package ID
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
      kahunas_package: "vip-coaching", // Specifiek Kahunas package ID
    },
  },
  {
    id: "12-weken-vetverlies",
    name: "12-Weken Vetverlies Programma",
    description: "Compleet programma voor duurzaam vetverlies",
    price: 50, // €0.50 (voor testen - minimale prijs voor Stripe)
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
      clickfunnels_course_id: "eWbLVk", // Course ID voor het 12-weken schema
      kahunas_package: "12-week-fat-loss", // Specifiek Kahunas package ID
    },
  },
]

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id)
}
