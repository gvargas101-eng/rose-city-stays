import dotenv from "dotenv";
import { readFileSync } from "fs";

// Load env
dotenv.config();

const ACCOUNT_ID = process.env.HOSTAWAY_ACCOUNT_ID;
const API_SECRET = process.env.HOSTAWAY_API_SECRET;

if (!ACCOUNT_ID || !API_SECRET) {
  console.error("Missing HOSTAWAY_ACCOUNT_ID or HOSTAWAY_API_SECRET");
  process.exit(1);
}

// Get OAuth token
async function getToken() {
  const res = await fetch("https://api.hostaway.com/v1/accessTokens", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: ACCOUNT_ID,
      client_secret: API_SECRET,
      scope: "general",
    }),
  });
  const data = await res.json();
  return data.access_token;
}

async function hostawayGet(token, path) {
  const res = await fetch(`https://api.hostaway.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" },
  });
  return res.json();
}

async function main() {
  console.log("Getting Hostaway token...");
  const token = await getToken();
  console.log("Token obtained:", token ? "yes" : "no");

  // 1. List all listings to get IDs
  console.log("\n--- Listings (first 3) ---");
  const listings = await hostawayGet(token, "/listings?limit=3&includeResources=false");
  const listingIds = (listings.result || []).map(l => l.id);
  console.log("Listing IDs:", listingIds);
  if (listings.result?.[0]) {
    const l = listings.result[0];
    console.log("Sample listing keys:", Object.keys(l).join(", "));
    // Check for channel-related fields
    const channelFields = Object.keys(l).filter(k => 
      k.toLowerCase().includes("channel") || 
      k.toLowerCase().includes("markup") || 
      k.toLowerCase().includes("fee") ||
      k.toLowerCase().includes("price") ||
      k.toLowerCase().includes("rate")
    );
    console.log("Channel/price related fields:", channelFields);
    channelFields.forEach(f => console.log(`  ${f}:`, l[f]));
  }

  // 2. Try channel accounts endpoint
  console.log("\n--- Channel Accounts ---");
  const channels = await hostawayGet(token, "/channelAccounts?limit=10");
  console.log(JSON.stringify(channels, null, 2).slice(0, 2000));

  // 3. Try listing channels for first listing
  if (listingIds[0]) {
    console.log(`\n--- Listing Channels for listing ${listingIds[0]} ---`);
    const lc = await hostawayGet(token, `/listings/${listingIds[0]}/channels`);
    console.log(JSON.stringify(lc, null, 2).slice(0, 2000));
  }

  // 4. Try pricing/rate plan endpoints
  console.log("\n--- Rate Plans ---");
  const rates = await hostawayGet(token, "/ratePlans?limit=5");
  console.log(JSON.stringify(rates, null, 2).slice(0, 1500));
}

main().catch(console.error);
