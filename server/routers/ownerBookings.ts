import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  createOwnerBooking,
  createOwnerPaymentLink,
  ownerBookingInput,
} from "../owner-bookings";

export const ownerBookingsRouter = router({
  create: adminProcedure
    .input(ownerBookingInput)
    .mutation(({ input, ctx }) =>
      createOwnerBooking(
        input,
        ctx.user?.openId ?? "authenticated-owner-session"
      )
    ),
  createPaymentLink: adminProcedure
    .input(
      z.object({
        bookingId: z.number().int().positive(),
        expiryDays: z.number().int().min(1).max(90).default(7),
      })
    )
    .mutation(({ input }) =>
      createOwnerPaymentLink(input.bookingId, input.expiryDays)
    ),
});
