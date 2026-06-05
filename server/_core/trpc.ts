import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { jwtVerify } from "jose";
import { ENV as env } from "./env";

const ADMIN_COOKIE = "admin_session";

/** Extract and verify the standalone admin_session cookie from the request. */
async function getAdminSessionFromCookie(req: TrpcContext["req"]): Promise<{ username: string } | null> {
  try {
    const cookies = (req.headers.cookie || "")
      .split(";")
      .reduce((acc: Record<string, string>, c) => {
        const trimmed = c.trim();
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          acc[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
        }
        return acc;
      }, {});
    const token = cookies[ADMIN_COOKIE];
    if (!token) return null;
    const secret = new TextEncoder().encode(env.cookieSecret);
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "admin" || !payload.username) return null;
    return { username: payload.username as string };
  } catch {
    return null;
  }
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Accept either: Manus OAuth session with admin role, OR standalone admin_session cookie
    const isOAuthAdmin = ctx.user?.role === 'admin';
    const standaloneSession = isOAuthAdmin ? null : await getAdminSessionFromCookie(ctx.req);

    if (!isOAuthAdmin && !standaloneSession) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user, // may be null for standalone admin sessions
      },
    });
  }),
);
