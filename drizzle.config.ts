import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Run with `DATABASE_URL=... pnpm db:migrate` or load .env.local first.");
}

export default {
  // CRITICAL: point at the OWNED-ONLY barrel so drizzle-kit never sees
  // EC's auth/workspace tables in the schema. tablesFilter alone is not
  // enough — it restricts introspection but NOT schema parsing, so if
  // we pointed at index.ts (which re-exports external tables for runtime
  // queries), drizzle-kit would propose CREATE TABLE for every EC table.
  // (Confirmed the hard way during Batch 3 — 0001_charming_owl.sql was
  // a near-miss.) Keep this `lifeos.ts`, never `index.ts`.
  schema: "./lib/db/schema/lifeos.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Defense-in-depth: even if someone later changes the schema path
  // by accident, this filter still keeps introspection focused on
  // lifeos_* tables.
  tablesFilter: ["lifeos_*"],
  verbose: true,
  strict: true,
} satisfies Config;
