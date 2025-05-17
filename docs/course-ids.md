# Evotion Coaching Cursus IDs

Dit document bevat een overzicht van alle cursus IDs en hun bijbehorende namen voor toekomstig gebruik.

## Cursus IDs

| Cursus ID | Naam | URL |
|-----------|------|-----|
| eWbLVk | 12-Weken Vetverlies Programma | https://www.evotion-coaching.nl/community/c/12-weken-vetverlies-programma-cursus |
| vgDnxN | Voedingsplan Masterclass | https://www.evotion-coaching.nl/community/c/voedingsplan-masterclass |
| JMaGxK | Trainingsschema Masterclass | https://www.evotion-coaching.nl/community/c/trainingsschema-masterclass |

## Producten en bijbehorende cursussen

| Product ID | Product Naam | Cursus IDs |
|------------|--------------|------------|
| 12-weken-vetverlies | 12-Weken Vetverlies Programma | eWbLVk, vgDnxN, JMaGxK |
| coaching-basic | Basis Coaching Pakket | basic-course-1 |
| coaching-premium | Premium Coaching Pakket | premium-course-1, premium-course-2 |
| coaching-vip | VIP Coaching Pakket | vip-course-1, vip-course-2, vip-course-3 |

## Hoe cursus IDs toevoegen aan een product

Om een cursus ID toe te voegen aan een product, update je het `products.ts` bestand:

\`\`\`typescript
{
  id: "product-id",
  name: "Product Naam",
  // ...
  metadata: {
    clickfunnels_membership_level: "level",
    clickfunnels_course_ids: ["cursus-id-1", "cursus-id-2"], // Voeg hier de cursus IDs toe
    kahunas_package: "package-name",
  },
}
\`\`\`

## Testen van inschrijvingen

Bij het testen van inschrijvingen is het belangrijk om te controleren:

1. Dat nieuwe klanten worden ingeschreven voor alle cursussen die bij het product horen
2. Dat bestaande klanten die al toegang hebben tot één of meer van deze cursussen hun bestaande inschrijvingen behouden en alleen worden ingeschreven voor de cursussen waar ze nog geen toegang toe hebben
3. Dat de success page de juiste links toont naar alle cursussen waarvoor de klant is ingeschreven
