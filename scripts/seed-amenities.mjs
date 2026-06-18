import "dotenv/config";
import mysql from "mysql2/promise";

// Static amenities per property slug — keyed by ACTUAL DB slugs
const amenitiesBySlug = {
  // id:1 — The Briar (Spacious Home with 2 Living Areas)
  "the-briar": ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Street Parking", "Smart TV", "Dedicated Workspace", "24-hr Check-In"],
  // id:2 — Hospital District Retreat (Wall Ave)
  "hospital-district": ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Street Parking", "Smart TV", "Patio/Outdoor Space", "24-hr Check-In"],
  // id:3 — Rose at Hollytree
  "hollytree-golf-dining": ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Garage Parking", "Smart TV", "Golf Course Views", "24-hr Check-In"],
  // id:4 — The Alamo House
  "alamo-house": ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Driveway Parking", "Smart TV", "Dedicated Workspace", "24-hr Check-In"],
  // id:5 — Green Acres
  "green-acres": ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Driveway Parking", "Smart TV", "Large Backyard", "24-hr Check-In"],
  // id:6 — Legacy House
  "legacy-house": ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Driveway Parking", "Smart TV", "Dedicated Workspace", "24-hr Check-In"],
  // id:7 — Azalea Spring Cottage
  "azalea-spring-cottage": ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Driveway Parking", "Smart TV", "Garden/Patio", "24-hr Check-In"],
  // id:8 — Noir at Hollytree
  "noir-hollytree": ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Garage Parking", "Smart TV", "Golf Course Views", "24-hr Check-In"],
  // id:9 — Azul at Hollytree
  "hollytree-king-bed": ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Garage Parking", "Smart TV", "Golf Course Views", "24-hr Check-In"],
  // id:10 — Verde at Hollytree
  "hollytree-townhouse": ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Garage Parking", "Smart TV", "Patio/Outdoor Space", "24-hr Check-In"],
  // id:30001 — Houston Cottage (new listing)
  "cozy-3-bedrooms-walk-to-hospitals-downtown-stanleys": ["Free WiFi (500+ Mbps)", "Full Kitchen", "Air Conditioning", "Washing Machine", "Street Parking", "Smart TV", "Dedicated Workspace", "24-hr Check-In"],
};

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get all properties
const [props] = await conn.execute("SELECT id, slug FROM properties");

let total = 0;
for (const prop of props) {
  const amenities = amenitiesBySlug[prop.slug];
  if (!amenities) {
    console.log(`No amenities defined for slug: ${prop.slug}`);
    continue;
  }
  // Delete existing amenities for this property
  await conn.execute("DELETE FROM property_amenities WHERE propertyId = ?", [prop.id]);
  // Insert new amenities
  for (let i = 0; i < amenities.length; i++) {
    await conn.execute(
      "INSERT INTO property_amenities (propertyId, amenity, sortOrder) VALUES (?, ?, ?)",
      [prop.id, amenities[i], i]
    );
    total++;
  }
  console.log(`✓ ${prop.slug}: ${amenities.length} amenities seeded`);
}

await conn.end();
console.log(`\nDone — ${total} amenity rows inserted`);
