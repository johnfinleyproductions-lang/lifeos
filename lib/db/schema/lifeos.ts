/**
 * OWNED-ONLY barrel — exports only LifeOS-owned tables.
 *
 * This file is what drizzle.config.ts points at, so drizzle-kit only ever
 * sees these tables when generating migrations. External tables (auth,
 * workspaces) live in `./external/*` and are imported via `./index.ts`
 * for runtime queries — but drizzle-kit never sees them.
 *
 * If you ever change drizzle.config.ts to read from `./index.ts` instead,
 * the next `db:generate` will propose CREATE TABLE for every external
 * table — DO NOT APPLY that migration.
 */
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
