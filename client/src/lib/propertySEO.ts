/**
 * Per-property SEO override map.
 *
 * Each key is the property slug (matches the `slug` column in the DB).
 * Values provide hand-crafted, keyword-optimised meta tags that override
 * the generic dynamic generation in PropertyDetail.tsx.
 *
 * Title:       ≤ 60 characters
 * Description: 50–160 characters
 * Keywords:    3–8 focused terms
 */

export interface PropertySEOMeta {
  title: string;
  description: string;
  keywords: string[];
}

export const propertySEOMap: Record<string, PropertySEOMeta> = {
  // ── 1. The Briar ──────────────────────────────────────────────────────────
  "the-briar": {
    title: "The Briar — 3BR South Tyler Rental | Rose City Stays",
    description:
      "Spacious 3-bedroom, 2-bath South Tyler home with two living areas. Sleeps 10. Book direct and save — no Airbnb fees. Fast WiFi, self check-in.",
    keywords: [
      "The Briar Tyler TX rental",
      "South Tyler vacation rental",
      "sleeps 10 Tyler Texas",
      "large group rental Tyler TX",
      "3 bedroom rental Tyler TX",
      "book direct Tyler Texas",
      "Rose City Stays",
    ],
  },

  // ── 2. Hospital District ──────────────────────────────────────────────────
  "hospital-district": {
    title: "Hospital District Retreat — Tyler TX | Rose City Stays",
    description:
      "Walk to UT Health & Christus Trinity from this 3BR Midtown Tyler home. Ideal for travel nurses, medical staff & families. Sleeps 8. Book direct.",
    keywords: [
      "Tyler TX hospital district rental",
      "travel nurse housing Tyler TX",
      "walk to UT Health Tyler rental",
      "Christus Trinity housing Tyler",
      "Midtown Tyler short-term rental",
      "medical stay Tyler Texas",
      "3 bedroom Tyler TX",
    ],
  },

  // ── 3. Hollytree Golf & Dining ────────────────────────────────────────────
  "hollytree-golf-dining": {
    title: "Hollytree Golf & Dining Townhouse | Rose City Stays",
    description:
      "Stylish 3BR townhouse steps from Hollytree Golf Course, top dining & shopping in Tyler, TX. Sleeps 6. Book direct and skip the fees.",
    keywords: [
      "Hollytree golf rental Tyler TX",
      "Tyler TX townhouse rental",
      "near Hollytree Country Club",
      "Stone Leigh Tyler rental",
      "3 bedroom townhouse Tyler TX",
      "short-term rental near golf Tyler",
      "Rose City Stays Hollytree",
    ],
  },

  // ── 4. Alamo House ────────────────────────────────────────────────────────
  "alamo-house": {
    title: "The Alamo House — 4BR Tyler TX | Rose City Stays",
    description:
      "Family-friendly 4-bedroom, 2-bath home in South West Tyler with a king bed, blazing-fast internet & room for 8. Book direct and save on fees.",
    keywords: [
      "Alamo House Tyler TX",
      "4 bedroom rental Tyler Texas",
      "South West Tyler vacation rental",
      "family rental Tyler TX",
      "king bed rental Tyler Texas",
      "fast WiFi rental Tyler TX",
      "book direct Tyler Texas",
    ],
  },

  // ── 5. Green Acres ────────────────────────────────────────────────────────
  "green-acres": {
    title: "Green Acres — 3BR West Tyler Rental | Rose City Stays",
    description:
      "Quiet, stylishly updated 3BR West Tyler home with king & queen beds. Sleeps 8. Perfect for families & groups. Book direct — no extra fees.",
    keywords: [
      "Green Acres Tyler TX rental",
      "West Tyler vacation rental",
      "sleeps 8 Tyler Texas",
      "king queen bed rental Tyler",
      "quiet neighborhood Tyler TX rental",
      "3 bedroom West Tyler",
      "Rose City Stays",
    ],
  },

  // ── 6. Legacy House ───────────────────────────────────────────────────────
  "legacy-house": {
    title: "The Legacy House — 4BR Tyler TX | Rose City Stays",
    description:
      "Bring the whole crew to this spacious 4BR South West Tyler home. King bed, blazing internet, sleeps 8. Book direct and save on every stay.",
    keywords: [
      "Legacy House Tyler TX",
      "4 bedroom South West Tyler rental",
      "large group rental Tyler TX",
      "blazing internet rental Tyler",
      "family vacation rental Tyler TX",
      "book direct Tyler Texas",
      "Rose City Stays",
    ],
  },

  // ── 7. Azalea Spring Cottage ──────────────────────────────────────────────
  "azalea-spring-cottage": {
    title: "Azalea Spring Cottage — Midtown Tyler | Rose City Stays",
    description:
      "Charming remodeled 3BR cottage in Tyler's Azalea District, minutes from hospitals & downtown. Sleeps 6. Book direct for the best rate.",
    keywords: [
      "Azalea Spring Cottage Tyler TX",
      "Azalea District rental Tyler",
      "Midtown Tyler cottage rental",
      "near hospital Tyler TX rental",
      "charming cottage Tyler Texas",
      "3 bedroom Midtown Tyler",
      "Rose City Stays",
    ],
  },

  // ── 8. Noir at Hollytree ──────────────────────────────────────────────────
  "noir-hollytree": {
    title: "Noir at Hollytree — Stylish Tyler TX Townhome",
    description:
      "Modern, designer 3BR townhome near Hollytree in Tyler, TX. Sleeps 7. Central location close to dining, shopping & golf. Book direct & save.",
    keywords: [
      "Noir Hollytree Tyler TX",
      "stylish townhome Tyler Texas",
      "Hollytree rental Tyler TX",
      "modern short-term rental Tyler",
      "3 bedroom townhome Tyler TX",
      "central Tyler TX rental",
      "Rose City Stays",
    ],
  },

  // ── 9. Azul at Hollytree (King Bed) ──────────────────────────────────────
  "hollytree-king-bed": {
    title: "Azul at Hollytree — King Bed Townhouse | Tyler TX",
    description:
      "Bright 3BR Hollytree townhouse with a king bed, steps from the golf course & top Tyler dining. Sleeps 6. Book direct at Rose City Stays.",
    keywords: [
      "Hollytree king bed rental Tyler",
      "Azul Hollytree Tyler TX",
      "townhouse near golf Tyler TX",
      "king bed short-term rental Tyler",
      "3 bedroom Hollytree Tyler",
      "book direct Tyler Texas",
      "Rose City Stays",
    ],
  },

  // ── 10. Hollytree Townhouse ───────────────────────────────────────────────
  "hollytree-townhouse": {
    title: "Hollytree Townhouse — King Bed Tyler TX Rental",
    description:
      "Refined 3BR Hollytree townhouse with a king bed, elegant décor & unbeatable Tyler location. Sleeps 7. Book direct and skip the platform fees.",
    keywords: [
      "Hollytree Townhouse Tyler TX",
      "king bed townhouse Tyler Texas",
      "elegant rental Tyler TX",
      "Hollytree short-term rental",
      "3 bedroom Tyler TX townhouse",
      "book direct Tyler Texas",
      "Rose City Stays",
    ],
  },

  // ── 11. Cozy 3BR Near Hospitals & Downtown ────────────────────────────────
  "cozy-3-bedrooms-walk-to-hospitals-downtown-stanleys": {
    title: "3BR Near Hospitals & Downtown Tyler | Rose City Stays",
    description:
      "Walk to UT Health, Christus & downtown Tyler from this cozy 3BR home with 3 king beds. Sleeps 6. Ideal for medical stays. Book direct.",
    keywords: [
      "walk to hospital Tyler TX rental",
      "near downtown Tyler Texas rental",
      "3 king beds Tyler TX",
      "Midtown Tyler short-term rental",
      "travel nurse housing Tyler TX",
      "cozy rental near Stanleys Tyler",
      "Rose City Stays",
    ],
  },
};
