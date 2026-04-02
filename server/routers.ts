import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  inquiry: router({
    submit: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().optional(),
          dates: z.string().optional(),
          guests: z.string().optional(),
          property: z.string().optional(),
          message: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const lines = [
          `**Name:** ${input.name}`,
          `**Email:** ${input.email}`,
          input.phone ? `**Phone:** ${input.phone}` : null,
          input.dates ? `**Dates:** ${input.dates}` : null,
          input.guests ? `**Guests:** ${input.guests}` : null,
          input.property ? `**Property:** ${input.property}` : null,
          input.message ? `**Message:** ${input.message}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        await notifyOwner({
          title: `New Inquiry from ${input.name}`,
          content: lines,
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
