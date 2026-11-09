import { table, id, owner, ref, text, date, timestamp } from "../table";

/**
 * Habit completions — one row per (habit, date).
 *
 * Deleting a habit deletes its completions. NoCodeBackend has no foreign
 * keys, so that cascade is declared in lib/db/index.ts.
 *
 * UNIQUE(habit_id, completion_date) means toggling = INSERT/DELETE rather
 * than upsert. Simpler and matches the wizard pattern.
 */
export const lifeosHabitCompletions = table(
  "lifeos_habit_completions",
  {
    id: id(),
    habitId: ref("habit_id").notNull(),
    userId: owner().notNull(),
    completionDate: date("completion_date").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  });

export type LifeosHabitCompletion = typeof lifeosHabitCompletions.$inferSelect;
export type NewLifeosHabitCompletion =
  typeof lifeosHabitCompletions.$inferInsert;
