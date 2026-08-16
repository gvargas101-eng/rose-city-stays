import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { createLocalEventsDraft, localEventsDraftSchema } from "./local-events-drafts";

/** Receives a researched event draft from the monthly agent task. */
export async function scheduledLocalEventsBlogHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const draft = await createLocalEventsDraft(localEventsDraftSchema.parse(req.body));
    return res.status(201).json({ ok: true, draft });
  } catch (error: any) {
    console.error("[Local Events Draft] Scheduled draft creation failed:", error.message);
    return res.status(500).json({
      error: error.message ?? "Unable to create the events draft",
      timestamp: new Date().toISOString(),
    });
  }
}
