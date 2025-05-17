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
      clickfunnels_course_ids: ["basic-course-1"], // Voorbeeld course ID
      kahunas_package: "basic-coaching",
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
      clickfunnels_course_ids: ["premium-course-1", "premium-course-2"], // Meerdere cursussen
      kahunas_package: "premium-coaching",
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
      clickfunnels_course_ids: ["vip-course-1", "vip-course-2", "vip-course-3"], // Nog meer cursussen
      kahunas_package: "vip-coaching",
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
      clickfunnels_course_ids: ["eWbLVk", "vgDnxN", "JMaGxK"], // Toegevoegd de nieuwe course IDs
      kahunas_package: "12-week-fat-loss",
    },
  },
]

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id)
}

// Nieuwe functie om een overzicht te krijgen van product-cursus toewijzingen
export function getProductCourseMapping(): Record<string, { productName: string; courses: string[] }> {
  const mapping: Record<string, { productName: string; courses: string[] }> = {}

  products.forEach((product) => {
    mapping[product.id] = {
      productName: product.name,
      courses: product.metadata?.clickfunnels_course_ids || [],
    }
  })

  return mapping
}
