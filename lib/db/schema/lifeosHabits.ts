import { table, id, owner, text, boolean, timestamp } from "../table";

/**
 * Habits — recurring rituals the user wants to build.
 *
 * Cadence is text rather than enum because we can extend it later (custom
 * weekly patterns, etc.) without DDL migrations. Standard values:
 *   - 'daily' (every day)
 *   - 'weekdays' (Mon-Fri)
 *   - 'weekly' (any day of the week, just count weeks)
 *
 * The MIND OS Habit Architecture fields (stack_anchor, reward, protection)
 * are optional but central to the framework — see Phase 5 protocol.
 */
export const lifeosHabits = table(
  "lifeos_habits",
  {
    id: id(),
    userId: owner().notNull(),
    name: text("name").notNull(),
    cadence: text("cadence").notNull().default("daily"),
    description: text("description"),
    stackAnchor: text("stack_anchor"),
    reward: text("reward"),
    protection: text("protection"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow(),
  });

export type LifeosHabit = typeof lifeosHabits.$inferSelect;
export type NewLifeosHabit = typeof lifeosHabits.$inferInsert;
