/**
 * LifeOS's Better Auth instance.
 *
 * Minimal config: this app only validates sessions created by Evergreen Core.
 * No providers, no email, no plugins beyond nextCookies(). The shared
 * BETTER_AUTH_SECRET + the same database means LifeOS can read EC's session
 * cookie and look up the session row directly.
 *
 * What is NOT here (and why):
 * - No socialProviders, magicLink, emailAndPassword — LifeOS never creates
 *   users or sessions; users sign in via EC's modal. If a user hits LifeOS
 *   without a session, redirect them to EC's `/auth` to sign in there.
 * - No databaseHooks — only EC owns user lifecycle (profile sync, default
 *   workspace creation, email contact sync).
 * - No cookieDomain — cookies work across localhost ports for dev. For
 *   production deploy, both EC and LifeOS need to add
 *   `advanced.crossSubDomainCookies = { enabled: true, domain: ".evergreenwellnessmktg.com" }`.
 *   This is Phase 10 work; Phase 1 ships dev-only.
 * - No `advanced.database.generateId` — LifeOS doesn't insert into auth tables.
 *   EC's existing setting (`generateId: "uuid"`) is what controls those rows.
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
  },
  plugins: [nextCookies()],
});

export type AuthInstance = typeof auth;
