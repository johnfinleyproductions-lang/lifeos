/**
 * LifeOS's Better Auth instance.
 *
 * Minimal config: this app only validates sessions created by Evergreen Core.
 * No providers, no email, no plugins beyond nextCookies(). The shared
 * BETTER_AUTH_SECRET + the same database means LifeOS can read EC's session
 * cookie and look up the session row directly.
 *
 * Production SSO: when BETTER_AUTH_COOKIE_DOMAIN is set (e.g. on Coolify),
 * we enable crossSubDomainCookies so a session set at app.<domain> validates
 * at lifeos.<domain>. EC must have the same env var with the same value —
 * see DEPLOY.md for the EC patch (the ONE EC code change in this build).
 *
 * What is NOT here (and why):
 * - No socialProviders, magicLink, emailAndPassword — LifeOS never creates
 *   users or sessions; users sign in via EC's modal. If a user hits LifeOS
 *   without a session, redirect them to EC's `/auth` to sign in there.
 * - No databaseHooks — only EC owns user lifecycle.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as dbSchema from "@/lib/db/schema";

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
    // Cross-subdomain cookies for production SSO. Only enabled when the
    // env var is explicitly set, so local dev (no var) keeps cross-port
    // localhost cookies working as-is.
    ...(cookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: cookieDomain,
          },
        }
      : {}),
  },
  plugins: [nextCookies()],
});

export type AuthInstance = typeof auth;
