import { table, id, owner, ref, text, boolean, date, timestamp } from "../table";

/**
 * One row per day of an experiment that the person marked: done or not, and
 * a line on how it went. A day with no row was never marked.
 *
 * `reason` is asked only on a day that was not done, and is one of 'head'
 * (not sure it is worth doing), 'heart' (did not feel like it) or 'hand'
 * (something practical got in the way). It is there so the review at the end
 * can show which of the three kept turning up.
 *
 * One row per experiment per day, held by a unique index in the database.
 */
export const lifeosExperimentDays = table("lifeos_experiment_days", {
  id: id(),
  userId: owner().notNull(),
  experimentId: ref("experiment_id").notNull(),
  entryDate: date("entry_date").notNull(),
  done: boolean("done").notNull().default(false),
  note: text("note"),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type LifeosExperimentDay = typeof lifeosExperimentDays.$inferSelect;
