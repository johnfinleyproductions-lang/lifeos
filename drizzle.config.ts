import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Run with `DATABASE_URL=... pnpm db:migrate` or load .env.local first.");
}

export default {
  // Point at the OWNED-ONLY barrel. tablesFilter alone is not enough:
  // it restricts introspection but not schema parsing, so pointing at
  // index.ts (which re-exports workspaces for runtime queries) would
  // have drizzle-kit propose CREATE TABLE for tables Evergreen Core
  // still owns. Keep this `lifeos.ts`, never `index.ts`.
  //
  // Since Phase 1 this barrel also carries the four better-auth tables,
  // which LifeOS now owns and migrates. The workspace tables are still
  // EC's and stay out.
  schema: "./lib/db/schema/lifeos.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Defence in depth: if the schema path is ever changed by accident,
  // this still keeps introspection to the tables LifeOS owns. The four
  // auth tables are named without a prefix because better-auth expects
  // those exact names.
  tablesFilter: ["lifeos_*", "user", "session", "account", "verification"],
  verbose: true,
  strict: true,
} satisfies Config;
