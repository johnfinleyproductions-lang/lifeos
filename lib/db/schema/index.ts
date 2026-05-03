/**
 * Schema barrel.
 *
 * Owned (LifeOS migrates these):
 *   - lifeos_daily_checkins (Phase 1)
 *   - lifeos_habits, lifeos_habit_completions, lifeos_focus_sessions (Phase 4)
 *   - lifeos_quests, lifeos_compass (Phase 3)
 *   - lifeos_protocol_runs, lifeos_confidence_entries, lifeos_reframes_seen (Phase 5)
 *   - lifeos_journal_entries, lifeos_open_loops (Phase 4.5)
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
export * from "./lifeosHabits";
export * from "./lifeosHabitCompletions";
export * from "./lifeosFocusSessions";
export * from "./lifeosQuests";
export * from "./lifeosCompass";
export * from "./lifeosProtocolRuns";
export * from "./lifeosConfidenceEntries";
export * from "./lifeosReframesSeen";
export * from "./lifeosJournalEntries";
export * from "./lifeosOpenLoops";

// External — never migrated, only queried
export * from "./external/auth";
export * from "./external/workspaces";
