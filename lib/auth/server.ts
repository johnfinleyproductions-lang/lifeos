/**
 * LifeOS's Better Auth instance.
 *
 * Multi-user mode: magic-link sign-in via /auth, with auto workspace
 * creation on first sign-up. Sessions are stored in the shared `session`
 * table; if EC is also deployed and shares the cookieDomain, sessions
 * created here ALSO validate at EC and vice versa.
 *
 * Single-user fallback: when LIFEOS_FALLBACK_USER_ID env var is set,
 * server-helpers.ts treats every request as that user even without a
 * session. Useful for personal-only deploys where you don't want to
 * sign in repeatedly. Real sessions still win when present.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as dbSchema from "@/lib/db/schema";
import { ensureWorkspaceForUser } from "@/lib/db/workspace/auto-create";
import { sendAuthEmail } from "./email";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is not set. It MUST equal Evergreen Core's BETTER_AUTH_SECRET — this is what makes shared sessions work.",
  );
}

const BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3001";

const extraTrustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const trustedOrigins = Array.from(
  new Set(
    [
      BETTER_AUTH_URL,
      process.env.NEXT_PUBLIC_APP_URL?.trim(),
      process.env.NEXT_PUBLIC_EC_URL?.trim(),
      "http://localhost:3000",
      "http://localhost:3001",
      ...extraTrustedOrigins,
    ].filter((value): value is string => Boolean(value)),
  ),
);

const cookieDomain = process.env.BETTER_AUTH_COOKIE_DOMAIN?.trim();

export const auth = betterAuth({
  appName: "LifeOS",
  baseURL: BETTER_AUTH_URL,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...dbSchema,
      user: dbSchema.authUsers,
      session: dbSchema.authSessions,
      account: dbSchema.authAccounts,
      verification: dbSchema.authVerifications,
    },
  }),
  advanced: {
    database: {
      generateId: "uuid",
    },
    ...(cookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: cookieDomain,
          },
        }
      : {}),
  },
  // Magic link is the primary sign-in. emailAndPassword left disabled — we
  // can enable it later if anyone explicitly wants password-based login.
  plugins: [
    nextCookies(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendAuthEmail({
          to: email,
          subject: "Your LifeOS sign-in link",
          body:
            "Tap the button below to sign in to LifeOS. The link expires in 5 minutes — if it does, just request a new one.",
          url,
        });
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Auto-provision a workspace + ownership row for every new user.
          // Idempotent — won't double-create if hook fires twice.
          try {
            await ensureWorkspaceForUser(user);
          } catch (e) {
            // Don't fail the sign-up over a workspace error — log and continue.
            // User can be assigned a workspace manually later if needed.
            console.error("ensureWorkspaceForUser failed:", e);
          }
        },
      },
    },
  },
});

export type AuthInstance = typeof auth;
