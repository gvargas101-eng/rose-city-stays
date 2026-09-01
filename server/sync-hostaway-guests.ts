/**
 * Project-level scheduled reconciliation for the Hostaway guest directory.
 * Webhooks provide the fast path; this job repairs any delayed or missed event.
 */
import type { Request, Response } from "express";
import { syncRecentHostawayGuests } from "./hostaway-guests";
import { sdk } from "./_core/sdk";

export async function syncHostawayGuestsHandler(request: Request, response: Response) {
  try {
    const user = await sdk.authenticateRequest(request);
    if (!user.isCron || !user.taskUid) {
      return response.status(403).json({ error: "cron-only" });
    }
  } catch {
    return response.status(403).json({ error: "cron-only" });
  }

  try {
    const summary = await syncRecentHostawayGuests();
    return response.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Guest reconciliation failed";
    console.error(`[Hostaway guest reconciliation] ${message}`);
    return response.status(500).json({ error: "Guest reconciliation failed" });
  }
}
