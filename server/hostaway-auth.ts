/**
 * Shared Hostaway OAuth token helper
 * Used by both hostaway.ts (calendar) and hostaway-booking.ts (reservations)
 */

const HOSTAWAY_API_BASE = "https://api.hostaway.com/v1";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const accountId = process.env.HOSTAWAY_ACCOUNT_ID;
  const apiSecret = process.env.HOSTAWAY_API_SECRET;

  if (!accountId || !apiSecret) {
    throw new Error("Hostaway credentials not configured");
  }

  const res = await fetch(`${HOSTAWAY_API_BASE}/accessTokens`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: accountId,
      client_secret: apiSecret,
      scope: "general",
    }),
  });

  if (!res.ok) {
    throw new Error(`Hostaway auth failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}
