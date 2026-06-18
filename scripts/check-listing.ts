import "dotenv/config";
import { getAccessToken } from "../server/hostaway-auth";

const token = await getAccessToken();
const res = await fetch("https://api.hostaway.com/v1/listings/329641", {
  headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" },
});
const data = await res.json();
const listing = data.result ?? {};
const keys = Object.keys(listing);
console.log("All keys:", keys.join(", "));
const amenityKeys = keys.filter(k => k.toLowerCase().includes("amenity") || k.toLowerCase().includes("feature"));
console.log("Amenity-related keys:", amenityKeys);
for (const k of amenityKeys) {
  console.log(`${k}:`, listing[k]);
}
process.exit(0);
