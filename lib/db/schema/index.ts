/**
 * Schema barrel.
 *
 * Owned (LifeOS migrates these):
 *   - lifeos_daily_checkins (Phase 1)
 *   - lifeos_quests (Phase 3)
 *   - lifeos_compass (Phase 3)
 *   - lifeos_focus_sessions, lifeos_habits, lifeos_habit_completions (Phase 4)
 *   - lifeos_journal_entries, lifeos_open_loops (Phase 4.5)
 *   - lifeos_protocol_runs, lifeos_confidence_entries, lifeos_reframes_seen (Phase 5)
 *
 * External (Evergreen Core owns these — re-declared here for type-safe queries):
 *   - user, session, account, verification (Better Auth)
 *   - workspaces, workspace_members
 *
 * The drizzle-kit migration generator only acts on tables matching
 * `lifeos_*` (see drizzle.config.ts tablesFilter), so external tables
 * are never proposed for migration.
 */

// Owned
export * from "./lifeosDailyCheckins";

// External — never migrated, only queried
export * from "./external/auth";
export * from "./external/workspaces";
