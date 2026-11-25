import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { discountCodes, discountCodeUses, discountCodeGuestOverrides, discountCodeClaims } from "../../drizzle/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { getDiscountUsage, normalizeDiscountEmail, quoteDiscount, reconcileDiscountClaims } from "../discount-claims";

const email = z.string().trim().email().max(320).transform(normalizeDiscountEmail);
const code = z.string().trim().min(1).max(64).transform(s => s.toUpperCase());
const cap = z.number().int().min(0).max(2147483647);
const codeFields = z.object({
  code,
  label: z.string().trim().min(1).max(128),
  discountType: z.enum(["percent", "fixed"]).default("percent"),
  discountValue: z.number().finite().positive().max(999999.99),
  maxTotalUses: cap.nullable().default(null),
  maxUsesPerGuest: cap.default(3),
  expiresAt: z.number().int().nonnegative().nullable().default(null),
  propertyRestrictions: z.array(z.string().trim().min(1).max(64)).default([]),
  adminNotes: z.string().optional(),
}).refine(input => input.discountType !== "percent" || input.discountValue <= 100, { message: "Percent discount cannot exceed 100%.", path: ["discountValue"] });

async function database() { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); return db; }
const storedCode = (input: z.infer<typeof codeFields>) => ({ ...input, discountValue: String(input.discountValue), propertyRestrictions: input.propertyRestrictions.length ? JSON.stringify(input.propertyRestrictions) : null, adminNotes: input.adminNotes ?? null });

export const discountCodesRouter = router({
  /** Advisory preview only; capacity is atomically reserved again at checkout. */
  validate: publicProcedure.input(z.object({ code, guestEmail: email, nightlySubtotal: z.number().finite().positive(), propertyId: z.string().min(1).max(64).optional() }))
    .mutation(async ({ input }) => {
      // Terminal unpaid Checkout sessions release temporary capacity, paid sessions
      // count durably even if a webhook was delayed. Never free on local time alone.
      if (process.env.STRIPE_SECRET_KEY) await reconcileDiscountClaims(new Stripe(process.env.STRIPE_SECRET_KEY), { code: input.code });
      return quoteDiscount(input);
    }),

  list: adminProcedure.query(async () => {
    const db = await database();
    const rows = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
    const counts = await db.select({ discountCodeId: discountCodeUses.discountCodeId, total: count() }).from(discountCodeUses).groupBy(discountCodeUses.discountCodeId);
    const pending = await db.select({ discountCodeId: discountCodeClaims.discountCodeId, total: count() }).from(discountCodeClaims).where(eq(discountCodeClaims.status, "pending")).groupBy(discountCodeClaims.discountCodeId);
    return rows.map(r => ({ ...r, discountValue: Number(r.discountValue), totalUses: counts.find(c => c.discountCodeId === r.id)?.total ?? 0, pendingUses: pending.find(c => c.discountCodeId === r.id)?.total ?? 0 }));
  }),
  create: adminProcedure.input(codeFields).mutation(async ({ input }) => {
    const db = await database();
    await db.insert(discountCodes).values({ ...storedCode(input), isActive: 1 });
    return { success: true };
  }),
  update: adminProcedure.input(codeFields.safeExtend({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await database();
    const { id, ...fields } = input;
    // Same campaign-row lock used by claims serializes a cap change with issuance.
    await db.transaction(async tx => {
      const [dc] = await tx.select().from(discountCodes).where(eq(discountCodes.id, id)).limit(1).for("update");
      if (!dc) throw new TRPCError({ code: "NOT_FOUND" });
      await tx.update(discountCodes).set(storedCode(fields)).where(eq(discountCodes.id, id));
    });
    return { success: true };
  }),
  toggle: adminProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ input }) => {
    const db = await database();
    await db.update(discountCodes).set({ isActive: input.isActive ? 1 : 0 }).where(eq(discountCodes.id, input.id));
    return { success: true };
  }),
  delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await database();
    await db.transaction(async tx => {
      await tx.select().from(discountCodes).where(eq(discountCodes.id, input.id)).limit(1).for("update");
      const [{ total }] = await tx.select({ total: count() }).from(discountCodeUses).where(eq(discountCodeUses.discountCodeId, input.id));
      const [{ claims }] = await tx.select({ claims: count() }).from(discountCodeClaims).where(eq(discountCodeClaims.discountCodeId, input.id));
      if (total || claims) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete a code with usage or checkout history. Deactivate it instead." });
      await tx.delete(discountCodeGuestOverrides).where(eq(discountCodeGuestOverrides.discountCodeId, input.id));
      await tx.delete(discountCodes).where(eq(discountCodes.id, input.id));
    });
    return { success: true };
  }),
  getGuestUses: adminProcedure.input(z.object({ codeId: z.number().int().positive(), guestEmail: email })).query(async ({ input }) => {
    const db = await database();
    const [dc] = await db.select().from(discountCodes).where(eq(discountCodes.id, input.codeId)).limit(1);
    if (!dc) throw new TRPCError({ code: "NOT_FOUND" });
    return { guestEmail: input.guestEmail, ...await getDiscountUsage(db, dc, input.guestEmail) };
  }),
  /** Absolute lifetime cap. No successful-use rows are ever deleted or reset. Null restores the campaign default. */
  setGuestLimit: adminProcedure.input(z.object({ codeId: z.number().int().positive(), guestEmail: email, newLimit: cap.nullable() })).mutation(async ({ input }) => {
    const db = await database();
    await db.transaction(async tx => {
      const [dc] = await tx.select().from(discountCodes).where(eq(discountCodes.id, input.codeId)).limit(1).for("update");
      if (!dc) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.newLimit === null) await tx.delete(discountCodeGuestOverrides).where(and(eq(discountCodeGuestOverrides.discountCodeId, dc.id), eq(discountCodeGuestOverrides.guestEmail, input.guestEmail)));
      else await tx.insert(discountCodeGuestOverrides).values({ discountCodeId: dc.id, guestEmail: input.guestEmail, maxUses: input.newLimit }).onDuplicateKeyUpdate({ set: { maxUses: input.newLimit } });
    });
    return { success: true, message: input.newLimit === null ? `Restored the default lifetime cap for ${input.guestEmail}. History retained.` : `Lifetime cap for ${input.guestEmail} set to ${input.newLimit}. History retained.` };
  }),
});
