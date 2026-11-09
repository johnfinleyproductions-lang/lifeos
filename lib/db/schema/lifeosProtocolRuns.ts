import { table, id, owner, text, integer, date, timestamp, json } from "../table";

/**
 * Protocol runs — a record of every time the user runs a guided exercise.
 *
 * Slug identifies which protocol (inner_audit, daily_confidence, etc.).
 * Payload is JSON (stored as text) keyed by prompt id, so each protocol can evolve its
 * prompt set without DDL churn.
 *
 * The runDate column is for "did I run this today?" lookups; created_at
 * is the wall-clock timestamp.
 */
export const lifeosProtocolRuns = table(
  "lifeos_protocol_runs",
  {
    id: id(),
    userId: owner().notNull(),
    slug: text("slug").notNull(),
    runDate: date("run_date").notNull(),
    payload: json("payload").notNull(),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  });

export type LifeosProtocolRun = typeof lifeosProtocolRuns.$inferSelect;
export type NewLifeosProtocolRun = typeof lifeosProtocolRuns.$inferInsert;
