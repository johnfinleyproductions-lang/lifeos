/**
 * Schema barrel. Every table in here is owned and migrated by LifeOS.
 *
 * The eleven lifeos_* tables, plus the four better-auth tables, which
 * came under LifeOS ownership in Phase 1.
 *
 * Nothing external is left. The workspace tables went in Phase 2: ten
 * routes wrote workspace_id on insert and nothing anywhere read it, so
 * they were removed rather than ported. If shared spaces are ever
 * wanted, they want a real membership model designed at the time, not
 * this column.
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

export * from "./auth";

