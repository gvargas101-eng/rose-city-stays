import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { cancellationRequestLimits, cancellationRequests } from "../../drizzle/cancellation-schema";
import { getDb } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { cancellationRequestInput, prepareRequest, receiveRequest } from "../cancellation-requests";

const unavailable = () => new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Requests are temporarily unavailable. Please contact Rose City Stays at (903) 714-4305." });

export const cancellationsRouter = router({
  submit: publicProcedure.input(cancellationRequestInput).mutation(async ({ input, ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw unavailable();
      // Do not trust user-supplied forwarded headers. req.ip follows server trust-proxy configuration.
      const ip = ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown";
      const now = Date.now();
      const prepared = prepareRequest(input, ip, ENV.cookieSecret, now);
      const result = await db.transaction(async tx => receiveRequest(prepared, {
        incrementBucket: async bucket => {
          await tx.insert(cancellationRequestLimits).values({ bucketKey: bucket.key, attempts: 1, expiresAt: bucket.expiresAt })
            .onDuplicateKeyUpdate({ set: { attempts: sql`${cancellationRequestLimits.attempts} + 1` } });
          const [row] = await tx.select({ attempts: cancellationRequestLimits.attempts }).from(cancellationRequestLimits)
            .where(eq(cancellationRequestLimits.bucketKey, bucket.key)).for("update");
          return row.attempts;
        },
        exists: async (key, activeKey) => {
          const rows = await tx.select({ id: cancellationRequests.id }).from(cancellationRequests)
            .where(or(eq(cancellationRequests.requestKey, key), eq(cancellationRequests.activeRequestKey, activeKey))).limit(1);
          return rows.length > 0;
        },
        insert: async values => {
          // Unique request/active keys prevent races even across separate email/IP buckets.
          await tx.insert(cancellationRequests).values(values).onDuplicateKeyUpdate({ set: { id: sql`${cancellationRequests.id}` } });
        },
      }));
      // Bounded cleanup is not part of request acceptance; never log identifying intake fields.
      try { await db.delete(cancellationRequestLimits).where(lt(cancellationRequestLimits.expiresAt, now - 86400000)).limit(100); } catch { /* retry on later intake */ }
      if (result.throttled) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later or call (903) 714-4305." });
      return result.receipt;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw unavailable();
    }
  }),
  list: adminProcedure.input(z.object({ status: z.enum(["all", "pending", "reviewed", "declined", "resolved"]).default("pending"), beforeId: z.number().int().positive().optional() }).default({ status: "pending" }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw unavailable();
        const rows = await db.select({
          id: cancellationRequests.id, reservationReference: cancellationRequests.reservationReference,
          bookingEmail: cancellationRequests.bookingEmail, phone: cancellationRequests.phone, reason: cancellationRequests.reason,
          requestedAt: cancellationRequests.requestedAt, status: cancellationRequests.status,
          reviewNotes: cancellationRequests.reviewNotes, reviewedAt: cancellationRequests.reviewedAt,
        }).from(cancellationRequests).where(and(
          input.status === "all" ? undefined : eq(cancellationRequests.status, input.status),
          input.beforeId ? lt(cancellationRequests.id, input.beforeId) : undefined,
        )).orderBy(desc(cancellationRequests.id)).limit(51);
        return { requests: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null };
      } catch { throw unavailable(); }
    }),
  review: adminProcedure.input(z.object({
    id: z.number().int().positive(), status: z.enum(["reviewed", "declined", "resolved"]),
    notes: z.string().trim().min(1).max(4000), administrativeOnlyAcknowledged: z.literal(true),
  })).mutation(async ({ input, ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw unavailable();
      const [row] = await db.select({ id: cancellationRequests.id }).from(cancellationRequests).where(eq(cancellationRequests.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      await db.update(cancellationRequests).set({ status: input.status, reviewNotes: input.notes,
        reviewedAt: Date.now(), reviewedBy: (ctx.user?.openId || "standalone-admin").slice(0, 128),
        ...(input.status !== "reviewed" ? { activeRequestKey: null } : {}),
      }).where(eq(cancellationRequests.id, input.id));
      return { saved: true, administrativeOnly: true } as const;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw unavailable();
    }
  }),
});
