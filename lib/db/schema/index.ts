/**
 * Schema barrel.
 *
 * As we add Core tables in later phases (quests, compass, focus, habits,
 * protocol_runs, confidence_entries, reframes_seen) and Journal tables in
 * Phase 4.5 (journal_entries, open_loops), they get re-exported here.
 *
 * The drizzle-kit migration generator only acts on tables matching
 * `lifeos_*` (see drizzle.config.ts tablesFilter), so we never accidentally
 * try to migrate Better Auth or workspaces tables that EC owns.
 */
export * from "./lifeosDailyCheckins";
