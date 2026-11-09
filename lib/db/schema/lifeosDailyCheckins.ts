import { table, id, owner, text, date, timestamp, json } from "../table";

/**
 * Daily check-ins — one row per (user, entry_date).
 *
 * - `morning` and `evening` are JSON (stored as text) so the wizard
 *   schemas can evolve without a schema change. Validate at the API layer
 *   with zod.
 * - `ritual_depth` controls quick / standard / deep prompt sets.
 * - `user_id` is set and filtered by NoCodeBackend from the session.
 * - The database enforces one row per (user_id, entry_date).
 *
 * Spec: §2.2 (Core tables).
 */
export const lifeosDailyCheckins = table(
  "lifeos_daily_checkins",
  {
    id: id(),
    userId: owner().notNull(),
    entryDate: date("entry_date").notNull(),
    morning: json("morning"),
    evening: json("evening"),
    ritualDepth: text("ritual_depth").notNull().default("standard"),
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow(),
  });

export type LifeosDailyCheckin = typeof lifeosDailyCheckins.$inferSelect;
export type NewLifeosDailyCheckin = typeof lifeosDailyCheckins.$inferInsert;
