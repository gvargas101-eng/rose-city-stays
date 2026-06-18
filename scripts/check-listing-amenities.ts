import "dotenv/config";
import { getAccessToken } from "../server/hostaway-auth";

const token = await getAccessToken();
const res = await fetch("https://api.hostaway.com/v1/listings/329641", {
  headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" },
});
const data = await res.json();
const listing = data.result ?? {};
console.log("listingAmenities:", JSON.stringify(listing.listingAmenities, null, 2));
process.exit(0);
