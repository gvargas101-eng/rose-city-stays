import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';

// Load env manually
try {
  const envContent = readFileSync('/home/ubuntu/rose-city-stays/.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
  }
} catch (e) {
  console.log('No .env file, using existing env');
}

const HOSTAWAY_API_BASE = 'https://api.hostaway.com/v1';
const ACCOUNT_ID = process.env.HOSTAWAY_ACCOUNT_ID;
const API_SECRET = process.env.HOSTAWAY_API_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

console.log('Connecting to DB...');
const conn = await mysql.createConnection(DATABASE_URL);

// Get access token
const tokenRes = await fetch(`${HOSTAWAY_API_BASE}/accessTokens`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: ACCOUNT_ID,
    client_secret: API_SECRET,
    scope: 'general',
  }),
});
const tokenData = await tokenRes.json();
const token = tokenData.access_token;

// Fetch all listings
const listingsRes = await fetch(`${HOSTAWAY_API_BASE}/listings?limit=100&includeResources=1`, {
  headers: { Authorization: `Bearer ${token}`, 'Cache-control': 'no-cache' },
});
const listingsData = await listingsRes.json();
const listings = listingsData.result ?? [];
console.log(`Fetched ${listings.length} listings`);

let updated = 0;
for (const listing of listings) {
  if (!listing.houseRules) continue;
  const [result] = await conn.execute(
    'UPDATE properties SET houseRules = ? WHERE hostawayListingId = ?',
    [listing.houseRules, listing.id]
  );
  if (result.affectedRows > 0) {
    console.log(`Updated [${listing.id}] ${listing.name.slice(0, 40)}`);
    updated++;
  } else {
    console.log(`Not found in DB: [${listing.id}] ${listing.name.slice(0, 40)}`);
  }
}

console.log(`\nDone. Updated ${updated} properties with house rules.`);
await conn.end();
