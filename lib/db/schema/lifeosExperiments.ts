import { table, id, owner, ref, text, integer, date, timestamp } from "../table";

/**
 * Experiments: something small, tried for a set time, then decided on.
 *
 * The shape follows Anne-Laure Le Cunff's Tiny Experiments. An experiment is
 * one sentence, "I will [action] for [length]", with the curiosity behind it.
 * It ends on a date. When it does, the person writes what worked, what did
 * not and what next, and chooses to keep going, pause or change it.
 *
 * `cadence` is 'daily', 'weekdays', or 'x1'..'x6' for a number of times a
 * week. `status` is 'running' or 'closed'; an experiment past its last day
 * and still 'running' is waiting to be closed. `outcome`, set on closing, is
 * 'again' (another round), 'habit' (it became a habit), 'paused' or
 * 'changed'. `previous_id` links a round to the one before it.
 */
export const lifeosExperiments = table("lifeos_experiments", {
  id: id(),
  userId: owner().notNull(),
  action: text("action").notNull(),
  curiosity: text("curiosity"),
  cadence: text("cadence").notNull().default("daily"),
  startDate: date("start_date").notNull(),
  lengthDays: integer("length_days").notNull(),
  status: text("status").notNull().default("running"),
  outcome: text("outcome"),
  worked: text("worked"),
  didNot: text("did_not"),
  nextStep: text("next_step"),
  closedAt: timestamp("closed_at"),
  previousId: ref("previous_id"),
  habitId: ref("habit_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type LifeosExperiment = typeof lifeosExperiments.$inferSelect;
