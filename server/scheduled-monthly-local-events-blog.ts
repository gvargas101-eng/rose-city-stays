import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { generateMonthlyLocalEventsDraft } from "./monthly-local-events-blog";

export async function scheduledMonthlyLocalEventsBlogHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });

    const result = await generateMonthlyLocalEventsDraft();
    return res.status(201).json({ ok: true, ...result });
  } catch (error: any) {
    console.error("[Monthly local events] Draft generation failed:", error.message);
    return res.status(500).json({ error: error.message ?? "Monthly events draft failed", timestamp: new Date().toISOString() });
  }
}
