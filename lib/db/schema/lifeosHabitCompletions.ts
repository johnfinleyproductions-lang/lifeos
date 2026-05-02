import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  date,
  text,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { lifeosHabits } from "./lifeosHabits";

/**
 * Habit completions — one row per (habit, date).
 *
 * Hard FK on habit_id with cascade delete (LifeOS owns both tables, unlike
 * the soft user_id/workspace_id refs which point at EC-owned tables).
 *
 * UNIQUE(habit_id, completion_date) means toggling = INSERT/DELETE rather
 * than upsert. Simpler and matches the wizard pattern.
 */
export const lifeosHabitCompletions = pgTable(
  "lifeos_habit_completions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => lifeosHabits.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    completionDate: date("completion_date").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    habitDateUnique: unique(
      "lifeos_habit_completions_habit_date_unique",
    ).on(table.habitId, table.completionDate),
    userDateIdx: index("idx_lifeos_habit_completions_user_date").on(
      table.userId,
      table.completionDate,
    ),
  }),
);

export type LifeosHabitCompletion = typeof lifeosHabitCompletions.$inferSelect;
export type NewLifeosHabitCompletion =
  typeof lifeosHabitCompletions.$inferInsert;
