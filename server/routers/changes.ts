import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  createBookingChange,
  listBookingChanges,
  quoteBookingChange,
  refundBookingChange,
} from "../booking-changes";

function requestOrigin(req: { headers: Record<string, string | string[] | undefined> }) {
  const origin = req.headers.origin;
  return typeof origin === "string" && /^https:\/\//.test(origin) ? origin : "https://www.rosecitystays.com";
}

const changeInput = z.object({
  bookingId: z.number().int().positive(),
  propertyId: z.string().min(1).max(64),
  newCheckIn: z.number().int().positive(),
  newCheckOut: z.number().int().positive(),
  priceAdjustment: z.number().finite().min(-100_000).max(100_000).default(0),
  adjustmentReason: z.string().trim().max(256).optional(),
});

export const changesRouter = router({
  quote: adminProcedure
    .input(changeInput)
    .mutation(({ input }) => quoteBookingChange(input)),

  create: adminProcedure
    .input(changeInput.extend({ settlementChoice: z.enum(["refund", "credit"]).default("refund") }))
    .mutation(({ input, ctx }) => createBookingChange({ ...input, origin: requestOrigin(ctx.req) })),

  refund: adminProcedure
    .input(z.object({ changeId: z.number().int().positive() }))
    .mutation(({ input }) => refundBookingChange(input.changeId)),

  listForBooking: adminProcedure
    .input(z.object({ bookingId: z.number().int().positive() }))
    .query(({ input }) => listBookingChanges(input.bookingId)),
});
