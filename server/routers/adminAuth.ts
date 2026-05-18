/**
 * adminAuth.ts — Standalone password-based admin login
 * Independent of Manus OAuth. Uses bcrypt for password hashing,
 * JWT for session tokens stored in a cookie.
 */
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { adminCredentials } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ENV as env } from "../_core/env";

const ADMIN_COOKIE = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function signAdminToken(username: string): Promise<string> {
  const secret = new TextEncoder().encode(env.cookieSecret);
  return new SignJWT({ username, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);
}

async function verifyAdminToken(token: string): Promise<{ username: string } | null> {
  try {
    const secret = new TextEncoder().encode(env.cookieSecret);
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "admin" || !payload.username) return null;
    return { username: payload.username as string };
  } catch {
    return null;
  }
}

export const adminAuthRouter = router({
  /**
   * Login with username + password. Sets an admin session cookie.
   */
  login: publicProcedure
    .input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [cred] = await db
        .select()
        .from(adminCredentials)
        .where(eq(adminCredentials.username, input.username))
        .limit(1);

      if (!cred) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
      }

      const valid = await bcrypt.compare(input.password, cred.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
      }

      const token = await signAdminToken(cred.username);

      // Set secure HTTP-only cookie
      ctx.res.setHeader("Set-Cookie", [
        `${ADMIN_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
      ]);

      return { success: true, username: cred.username };
    }),

  /**
   * Logout — clears the admin session cookie.
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res.setHeader("Set-Cookie", [
      `${ADMIN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
    ]);
    return { success: true };
  }),

  /**
   * Check if the current request has a valid admin session cookie.
   */
  me: publicProcedure.query(async ({ ctx }) => {
    const cookies = (ctx.req.headers.cookie || "")
      .split(";")
      .reduce((acc: Record<string, string>, c) => {
        const [k, v] = c.trim().split("=");
        if (k && v) acc[k] = v;
        return acc;
      }, {});

    const token = cookies[ADMIN_COOKIE];
    if (!token) return { authenticated: false };

    const payload = await verifyAdminToken(token);
    if (!payload) return { authenticated: false };

    return { authenticated: true, username: payload.username };
  }),

  /**
   * Change the admin password. Requires knowing the current password.
   */
  changePassword: publicProcedure
    .input(z.object({
      username: z.string().min(1),
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [cred] = await db
        .select()
        .from(adminCredentials)
        .where(eq(adminCredentials.username, input.username))
        .limit(1);

      if (!cred) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
      }

      const valid = await bcrypt.compare(input.currentPassword, cred.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
      }

      const newHash = await bcrypt.hash(input.newPassword, 12);
      await db
        .update(adminCredentials)
        .set({ passwordHash: newHash })
        .where(eq(adminCredentials.id, cred.id));

      return { success: true };
    }),

  /**
   * Setup — creates the initial admin account (only works if no credentials exist yet).
   */
  setup: publicProcedure
    .input(z.object({
      username: z.string().min(3).max(32),
      password: z.string().min(8, "Password must be at least 8 characters"),
      setupKey: z.string(), // one-time setup key to prevent unauthorized setup
    }))
    .mutation(async ({ input }) => {
      // Verify setup key matches env var
      const expectedKey = process.env.ADMIN_SETUP_KEY;
      if (!expectedKey || input.setupKey !== expectedKey) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid setup key" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const existing = await db.select().from(adminCredentials).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Admin credentials already configured" });
      }

      const hash = await bcrypt.hash(input.password, 12);
      await db.insert(adminCredentials).values({
        username: input.username,
        passwordHash: hash,
      });

      return { success: true };
    }),
});
