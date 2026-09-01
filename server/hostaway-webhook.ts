import type { Request, Response } from "express";
import { syncHostawayReservationById } from "./hostaway-guests";

const WEBHOOK_USERNAME = "rosecitystays";

function readBasicAuth(request: Request): { username: string; password: string } | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

export function isAuthorizedHostawayWebhook(request: Request): boolean {
  const expectedSecret = process.env.HOSTAWAY_WEBHOOK_SECRET;
  if (!expectedSecret) return false;
  const auth = readBasicAuth(request);
  return auth?.username === WEBHOOK_USERNAME && auth.password === expectedSecret;
}

export function reservationIdFromPayload(payload: Record<string, any>): string | null {
  const candidates = [
    payload.reservationId,
    payload.reservation?.id,
    payload.data?.reservationId,
    payload.data?.reservation?.id,
    payload.objectId,
  ];
  const value = candidates.find(candidate => candidate !== undefined && candidate !== null && String(candidate).trim());
  if (value === undefined) return null;

  const normalized = String(value).trim();
  // Hostaway's documented Object ID is a reservation ID. Do not guess from a
  // composite value: treating an opaque unified-event identifier as a
  // reservation ID caused API 404s and repeated delivery failures.
  return /^\d+$/.test(normalized) ? normalized : null;
}

function webhookEventName(payload: Record<string, any>): string {
  return String(payload.event ?? payload.eventType ?? payload.event_name ?? payload.type ?? "").toLowerCase();
}

/**
 * Hostaway unified webhook endpoint.
 * Hostaway sends a small event payload; the handler then retrieves current reservation
 * data through the authenticated Hostaway API so partial or out-of-order payloads cannot
 * overwrite the guest directory with stale data.
 */
export async function hostawayReservationWebhookHandler(request: Request, response: Response) {
  if (!isAuthorizedHostawayWebhook(request)) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const payload = (request.body ?? {}) as Record<string, any>;
  const event = webhookEventName(payload);
  if (event && event !== "reservation.created" && event !== "reservation.updated") {
    return response.status(200).json({ ok: true, skipped: "unsupported-event" });
  }

  const reservationId = reservationIdFromPayload(payload);
  if (!reservationId) {
    // A 2xx prevents repeated deliveries of malformed/unsupported messages. The periodic
    // reconciliation still repairs any missed contact update.
    console.warn("[Hostaway guest webhook] Deferred event without a numeric reservation ID", {
      event,
      keys: Object.keys(payload).sort(),
      objectIdType: typeof payload.objectId,
    });
    return response.status(200).json({ ok: true, skipped: "missing-reservation-id" });
  }

  try {
    await syncHostawayReservationById(reservationId);
    return response.status(200).json({ ok: true, reservationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Guest sync failed";
    console.error(`[Hostaway guest webhook] reservation ${reservationId}: ${message}`);
    // Reservation event details can arrive before the reservation endpoint is
    // queryable. The scheduled reconciliation is the durable backstop, so use
    // a successful acknowledgement to prevent Hostaway disabling this webhook.
    if (message.includes("(404)")) {
      return response.status(200).json({ ok: true, deferred: "reservation-not-yet-available" });
    }
    return response.status(500).json({ error: "Guest sync failed" });
  }
}
