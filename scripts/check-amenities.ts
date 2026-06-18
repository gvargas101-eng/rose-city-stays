import "dotenv/config";
import { getAccessToken } from "../server/hostaway-auth";

const token = await getAccessToken();
const res = await fetch("https://api.hostaway.com/v1/listings?limit=3&includeResources=1", {
  headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" },
});
const data = await res.json();
for (const listing of data.result ?? []) {
  console.log(`\n=== ${listing.name} (${listing.id}) ===`);
  console.log("amenities:", listing.amenities ?? "NONE");
  console.log("amenityIds:", listing.amenityIds ?? "NONE");
}
process.exit(0);
