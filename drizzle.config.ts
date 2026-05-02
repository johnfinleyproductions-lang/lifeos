import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Run with `DATABASE_URL=... pnpm db:migrate` or load .env.local first.");
}

export default {
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // CRITICAL: only LifeOS-owned tables are migrated. Better Auth + workspaces
  // are owned by Evergreen Core in the same database; LifeOS reads them but
  // never migrates them. Keep this filter in sync with §2.1-2.3 of the spec.
  tablesFilter: ["lifeos_*"],
  verbose: true,
  strict: true,
} satisfies Config;
