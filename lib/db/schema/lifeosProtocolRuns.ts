import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  jsonb,
  date,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Protocol runs — a record of every time the user runs a guided exercise.
 *
 * Slug identifies which protocol (inner_audit, daily_confidence, etc.).
 * Payload is jsonb keyed by prompt id, so each protocol can evolve its
 * prompt set without DDL churn.
 *
 * The runDate column is for "did I run this today?" lookups; created_at
 * is the wall-clock timestamp.
 */
export const lifeosProtocolRuns = pgTable(
  "lifeos_protocol_runs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    slug: text("slug").notNull(),
    runDate: date("run_date").notNull(),
    payload: jsonb("payload").notNull(),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userSlugDateIdx: index("idx_lifeos_protocol_runs_user_slug").on(
      table.userId,
      table.slug,
      table.runDate,
    ),
    userDateIdx: index("idx_lifeos_protocol_runs_user_date").on(
      table.userId,
      table.runDate,
    ),
  }),
);

export type LifeosProtocolRun = typeof lifeosProtocolRuns.$inferSelect;
export type NewLifeosProtocolRun = typeof lifeosProtocolRuns.$inferInsert;
