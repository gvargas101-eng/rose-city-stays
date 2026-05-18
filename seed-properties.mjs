/**
 * Seed script: populates the properties, property_photos, and property_amenities tables
 * from the existing hardcoded properties.ts data.
 * Run once: node seed-properties.mjs
 */

import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

// Load env
const envPath = "/home/ubuntu/rose-city-stays/.env";
try { dotenv.config({ path: envPath }); } catch {}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// All 10 properties data
const propertiesData = [
  {
    slug: "the-briar",
    name: "The Briar: Spacious 3BR Retreat – Peaceful Escape",
    shortName: "The Briar",
    type: "House",
    guests: 10,
    bedrooms: 3,
    bathrooms: "2.0",
    description: "Escape to The Briar — a spacious, thoughtfully designed retreat offering the perfect blend of comfort and tranquility. With soaring vaulted ceilings, a stone fireplace, and a fully equipped gourmet kitchen, this home is ideal for families, corporate retreats, and group getaways. Nestled in a peaceful Tyler neighborhood, you're minutes from top dining, shopping, and the famous Tyler Rose Garden.",
    shortDescription: "Spacious retreat with vaulted ceilings, stone fireplace, and gourmet kitchen. Perfect for families and groups.",
    neighborhood: "East Tyler",
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "100% refund up to 30 days before arrival. 50% refund up to 14 days before arrival.",
    hostawayListingId: 329641,
    cleaningFee: "150.00",
    sortOrder: 1,
    amenities: ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Street Parking", "Smart TV", "Workspace", "24-hr Check-In"],
    photos: [
      "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6NTM3NDIzMDc=/original/24dc11ef-797a-46c1-8e72-1a9375844706.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6NTM3NDIzMDc=/original/396c243e-9a3d-4620-8306-f431055b885a.png",
      "https://a0.muscache.com/im/pictures/9c76b10c-821d-4c0b-8d36-a7db5e39776b.jpg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6NTM3NDIzMDc=/original/71012ca3-2246-418d-a18f-c2f71b00291c.jpeg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6NTM3NDIzMDc=/original/22d2f8b3-a1e9-4771-9537-27d94f7d3703.jpeg",
      "https://a0.muscache.com/im/pictures/25c087a2-17f5-48c9-af7e-45618b1af124.jpg",
      "https://a0.muscache.com/im/pictures/acc9c268-0b21-4473-9e82-ddbd3cc61035.jpg",
      "https://a0.muscache.com/im/pictures/0bccfde0-e2a6-4909-a468-3eee65269c02.jpg",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6NTM3NDIzMDc=/original/799f3ce4-bd0e-4eac-8254-ba79ec42b5e1.jpeg",
      "https://a0.muscache.com/im/pictures/fd715df1-7c9d-438f-a75a-c10b8fb865b3.jpg",
    ],
  },
  {
    slug: "hospital-district",
    name: "Hospital District! Retreat! Wall Ave.",
    shortName: "Wall Ave. Retreat",
    type: "House",
    guests: 8,
    bedrooms: 3,
    bathrooms: "2.0",
    description: "Perfectly located in Tyler's Hospital District on Wall Ave., this beautifully appointed home is ideal for healthcare professionals, traveling nurses, and extended-stay guests. The open-plan layout, modern furnishings, and blazing-fast WiFi make it the ultimate work-from-home or work-from-Tyler base. Steps from CHRISTUS Trinity Mother Frances and UT Health Tyler.",
    shortDescription: "Ideal for healthcare professionals and extended stays. Modern furnishings, fast WiFi, prime Hospital District location.",
    neighborhood: "Hospital District",
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "100% refund up to 30 days before arrival. 50% refund up to 14 days before arrival.",
    hostawayListingId: 329642,
    cleaningFee: "125.00",
    sortOrder: 2,
    amenities: ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Street Parking", "Smart TV", "Dedicated Workspace", "24-hr Check-In"],
    photos: [
      "https://a0.muscache.com/im/pictures/miso/Hosting-52309431/original/069b8bd2-246c-4580-bee6-1ed2d362a6a8.jpeg",
      "https://a0.muscache.com/im/pictures/bfd7f72a-ede2-4d3d-8541-c4af29d303c2.jpg",
      "https://a0.muscache.com/im/pictures/59c80e89-aa31-4f9e-9f7a-054139e5b12c.jpg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-52309431/original/3557e32a-cbc7-4bf8-981e-bae8ca6dbcd3.jpeg",
      "https://a0.muscache.com/im/pictures/0b6e8f53-40d7-4880-97d0-a1f7e0f06f7d.jpg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-52309431/original/0f3b4a20-27e6-4698-9575-0792f7542fd6.jpeg",
      "https://a0.muscache.com/im/pictures/17b43666-c0ad-4d80-9495-05768e94d5e5.jpg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-52309431/original/da762ca6-944d-4452-8a01-051a5592c353.jpeg",
      "https://a0.muscache.com/im/pictures/5eb3b4e3-fc68-4f3a-aad6-772359dbee47.jpg",
      "https://a0.muscache.com/im/pictures/4dc3c9b1-f7c8-46ef-896b-094f7a8429a0.jpg",
    ],
  },
  {
    slug: "hollytree-golf-dining",
    name: "Hollytree Golf, Dining & Shopping — Perfect Location",
    shortName: "Hollytree Golf",
    type: "House",
    guests: 6,
    bedrooms: 3,
    bathrooms: "2.0",
    description: "Experience Tyler living at its finest in this stunning Hollytree home. Situated steps from the Hollytree Country Club golf course and surrounded by Tyler's best dining and shopping on Grande Blvd., this property offers an unbeatable location. The home features elegant interiors, a fully equipped kitchen, and a serene backyard perfect for unwinding after a day of exploring.",
    shortDescription: "Steps from Hollytree Country Club golf course. Tyler's best dining and shopping at your doorstep.",
    neighborhood: "Hollytree",
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "100% refund up to 30 days before arrival. 50% refund up to 14 days before arrival.",
    hostawayListingId: 329643,
    cleaningFee: "150.00",
    sortOrder: 3,
    amenities: ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Garage Parking", "Smart TV", "Patio/Outdoor Space", "24-hr Check-In"],
    photos: [
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/hollytree-golf-photo-01_29d8f2c8.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/hollytree-golf-photo-02_98ddddde.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/hollytree-golf-photo-03_58080e9e.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/hollytree-golf-photo-04_8d5e0a7e.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/hollytree-golf-photo-05_2e3e8f9a.jpg",
    ],
  },
  {
    slug: "alamo-house",
    name: "The Alamo House — Stylish 4BR Home",
    shortName: "The Alamo House",
    type: "House",
    guests: 10,
    bedrooms: 4,
    bathrooms: "2.0",
    description: "Welcome to The Alamo House — a beautifully updated 4-bedroom home that blends modern comfort with Texas charm. Featuring an open living area, fully equipped kitchen, and stylish decor throughout, this home is perfect for larger groups, family gatherings, or extended corporate stays. Conveniently located near Tyler's best shopping, dining, and medical centers.",
    shortDescription: "Stylish 4-bedroom home with modern updates. Perfect for larger groups and extended stays.",
    neighborhood: "South Tyler",
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "100% refund up to 30 days before arrival. 50% refund up to 14 days before arrival.",
    hostawayListingId: 329644,
    cleaningFee: "175.00",
    sortOrder: 4,
    amenities: ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Driveway Parking", "Smart TV", "Workspace", "24-hr Check-In"],
    photos: [
      "https://a0.muscache.com/im/pictures/miso/Hosting-52309432/original/alamo-1.jpeg",
      "https://a0.muscache.com/im/pictures/miso/Hosting-52309432/original/alamo-2.jpeg",
    ],
  },
  {
    slug: "green-acres",
    name: "Green Acres — Peaceful Country Retreat",
    shortName: "Green Acres",
    type: "House",
    guests: 8,
    bedrooms: 3,
    bathrooms: "2.0",
    description: "Escape the hustle and bustle at Green Acres — a serene country-style retreat just minutes from Tyler's amenities. This beautifully landscaped property features a spacious outdoor area, comfortable living spaces, and all the modern conveniences you need for a relaxing stay. Perfect for nature lovers, families, and anyone seeking peace and quiet.",
    shortDescription: "Serene country retreat with spacious outdoor area. Perfect for nature lovers and families.",
    neighborhood: "West Tyler",
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "100% refund up to 30 days before arrival. 50% refund up to 14 days before arrival.",
    hostawayListingId: 329645,
    cleaningFee: "150.00",
    sortOrder: 5,
    amenities: ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Driveway Parking", "Smart TV", "Large Outdoor Space", "24-hr Check-In"],
    photos: [
      "https://a0.muscache.com/im/pictures/miso/Hosting-green-acres/original/green-1.jpeg",
    ],
  },
  {
    slug: "legacy-house",
    name: "Legacy House — Elegant 4BR Estate",
    shortName: "Legacy House",
    type: "House",
    guests: 10,
    bedrooms: 4,
    bathrooms: "3.0",
    description: "The Legacy House is an elegant 4-bedroom estate offering the ultimate in luxury short-term living. With high ceilings, premium finishes, a chef's kitchen, and a resort-style backyard, this home is perfect for special occasions, corporate retreats, and discerning travelers who expect nothing but the best.",
    shortDescription: "Elegant 4-bedroom estate with chef's kitchen and resort-style backyard. Perfect for special occasions.",
    neighborhood: "North Tyler",
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "100% refund up to 30 days before arrival. 50% refund up to 14 days before arrival.",
    hostawayListingId: 329646,
    cleaningFee: "150.00",
    sortOrder: 6,
    amenities: ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Garage Parking", "Smart TV", "Pool/Hot Tub", "24-hr Check-In"],
    photos: [
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/legacy-1.jpg",
    ],
  },
  {
    slug: "azalea-spring-cottage",
    name: "Azalea Spring Cottage — Charming 2BR",
    shortName: "Azalea Cottage",
    type: "House",
    guests: 4,
    bedrooms: 2,
    bathrooms: "1.0",
    description: "Nestled in Tyler's historic Azalea District, this charming cottage is the perfect romantic getaway or quiet retreat for two. Beautifully decorated with vintage touches and modern comforts, the Azalea Spring Cottage puts you steps from Tyler's famous azalea trails, boutique shops, and cozy cafés.",
    shortDescription: "Charming cottage in Tyler's historic Azalea District. Perfect for couples and quiet retreats.",
    neighborhood: "Azalea District",
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "100% refund up to 30 days before arrival. 50% refund up to 14 days before arrival.",
    hostawayListingId: 329647,
    cleaningFee: "125.00",
    sortOrder: 7,
    amenities: ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Street Parking", "Smart TV", "Cozy Porch", "24-hr Check-In"],
    photos: [
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/azalea-1.jpg",
    ],
  },
  {
    slug: "noir-hollytree",
    name: "Noir Hollytree — Sophisticated 3BR",
    shortName: "Noir Hollytree",
    type: "House",
    guests: 6,
    bedrooms: 3,
    bathrooms: "2.0",
    description: "Noir Hollytree is a sophisticated, design-forward 3-bedroom home in the prestigious Hollytree neighborhood. Dark, moody interiors contrast with warm lighting and luxurious textures to create an unforgettable atmosphere. Perfect for design enthusiasts, creative professionals, and those who appreciate the finer things.",
    shortDescription: "Design-forward 3BR home with moody, sophisticated interiors. Prestigious Hollytree location.",
    neighborhood: "Hollytree",
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "100% refund up to 30 days before arrival. 50% refund up to 14 days before arrival.",
    hostawayListingId: 329648,
    cleaningFee: "125.00",
    sortOrder: 8,
    amenities: ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Garage Parking", "Smart TV", "Designer Interiors", "24-hr Check-In"],
    photos: [
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/noir-1.jpg",
    ],
  },
  {
    slug: "hollytree-king-bed",
    name: "Hollytree King Bed — Photo 5 & 6",
    shortName: "Hollytree Photo 5/6",
    type: "House",
    guests: 6,
    bedrooms: 3,
    bathrooms: "2.0",
    description: "A beautifully appointed Hollytree home featuring a luxurious king master suite and premium finishes throughout. Located in one of Tyler's most sought-after neighborhoods, this property offers easy access to the Hollytree Country Club, fine dining, and upscale shopping.",
    shortDescription: "Luxurious king master suite in prestigious Hollytree. Steps from country club and fine dining.",
    neighborhood: "Hollytree",
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "100% refund up to 30 days before arrival. 50% refund up to 14 days before arrival.",
    hostawayListingId: 329649,
    cleaningFee: "125.00",
    sortOrder: 9,
    amenities: ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Garage Parking", "Smart TV", "King Bed", "24-hr Check-In"],
    photos: [
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/Photo-1_f122bb77.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/Photo-2_b01d49bd.jpg",
    ],
  },
  {
    slug: "hollytree-townhouse",
    name: "Hollytree Townhouse — King Bed, Great Location",
    shortName: "Hollytree Townhouse",
    type: "Townhouse",
    guests: 7,
    bedrooms: 3,
    bathrooms: "2.0",
    description: "Experience unmatched comfort and refined elegance at our meticulously designed Rose City Stays Townhome. Nestled in the vibrant heart of Tyler, this exquisite property is perfectly situated amidst the enchanting beauty of Hollytree and Grande Blvd, providing an idyllic backdrop for your stay. Every detail has been thoughtfully curated to ensure your comfort — from the king master suite to the fully stocked kitchen.",
    shortDescription: "Refined townhouse in the heart of Hollytree. King master suite, elegant design, steps from Grande Blvd.",
    neighborhood: "Hollytree",
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM",
    cancellationPolicy: "100% refund up to 30 days before arrival. 50% refund up to 14 days before arrival.",
    hostawayListingId: 366803,
    cleaningFee: "125.00",
    sortOrder: 10,
    amenities: ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Street Parking", "Smart TV", "King Bed", "24-hr Check-In"],
    photos: [
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/Photo-5_35acfbd1.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/Photo-7_41f87239.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/Photo-2_b65ac856.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/Photo-3_02f07fb5.jpg",
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663501101810/bn23yPpAqDW8FGGWUFqWsM/Photo-4_a34228ed.jpg",
    ],
  },
];

async function seed() {
  const conn = await createConnection(DATABASE_URL);
  console.log("Connected to database");

  for (const prop of propertiesData) {
    const { amenities, photos, ...propData } = prop;

    // Check if property already exists
    const [existing] = await conn.execute(
      "SELECT id FROM properties WHERE slug = ?",
      [propData.slug]
    );

    let propertyId;
    if (existing.length > 0) {
      propertyId = existing[0].id;
      console.log(`Updating property: ${propData.slug} (id=${propertyId})`);
      await conn.execute(
        `UPDATE properties SET name=?, shortName=?, type=?, guests=?, bedrooms=?, bathrooms=?,
         description=?, shortDescription=?, neighborhood=?, checkInTime=?, checkOutTime=?,
         cancellationPolicy=?, hostawayListingId=?, cleaningFee=?, sortOrder=?
         WHERE id=?`,
        [propData.name, propData.shortName, propData.type, propData.guests, propData.bedrooms,
         propData.bathrooms, propData.description, propData.shortDescription, propData.neighborhood,
         propData.checkInTime, propData.checkOutTime, propData.cancellationPolicy,
         propData.hostawayListingId, propData.cleaningFee, propData.sortOrder, propertyId]
      );
    } else {
      console.log(`Inserting property: ${propData.slug}`);
      const [result] = await conn.execute(
        `INSERT INTO properties (slug, name, shortName, type, guests, bedrooms, bathrooms,
         description, shortDescription, neighborhood, checkInTime, checkOutTime,
         cancellationPolicy, hostawayListingId, cleaningFee, sortOrder, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [propData.slug, propData.name, propData.shortName, propData.type, propData.guests,
         propData.bedrooms, propData.bathrooms, propData.description, propData.shortDescription,
         propData.neighborhood, propData.checkInTime, propData.checkOutTime,
         propData.cancellationPolicy, propData.hostawayListingId, propData.cleaningFee,
         propData.sortOrder]
      );
      propertyId = result.insertId;
    }

    // Clear and re-insert photos
    await conn.execute("DELETE FROM property_photos WHERE propertyId = ?", [propertyId]);
    for (let i = 0; i < photos.length; i++) {
      await conn.execute(
        "INSERT INTO property_photos (propertyId, url, sortOrder) VALUES (?, ?, ?)",
        [propertyId, photos[i], i]
      );
    }
    console.log(`  → ${photos.length} photos inserted`);

    // Clear and re-insert amenities
    await conn.execute("DELETE FROM property_amenities WHERE propertyId = ?", [propertyId]);
    for (let i = 0; i < amenities.length; i++) {
      await conn.execute(
        "INSERT INTO property_amenities (propertyId, amenity, sortOrder) VALUES (?, ?, ?)",
        [propertyId, amenities[i], i]
      );
    }
    console.log(`  → ${amenities.length} amenities inserted`);
  }

  await conn.end();
  console.log("\n✅ Seed complete!");
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
