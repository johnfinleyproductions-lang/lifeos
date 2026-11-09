/**
 * Every table LifeOS keeps, in one place.
 *
 * These live in a NoCodeBackend database. NCB adds two columns to each table
 * on its own: an integer `id`, and `user_id`, which it fills from the
 * signed-in session and filters every read by. The definitions here name
 * both so the app can type them, but neither is ever chosen by the app.
 *
 * The people themselves (name, email, password hash, sessions) are in NCB's
 * own auth tables, which this app reaches only through sign-in. See
 * lib/ncb/session.ts.
 *
 * The live column list, as NCB reports it, is saved in docs/ncb/schema.json.
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
