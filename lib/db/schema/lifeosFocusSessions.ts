import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";

/**
 * Focus sessions — timed deep work blocks.
 *
 * Active sessions have started_at but ended_at IS NULL. The /focus page
 * shows the running session (if any) and lets the user stop it. On stop,
 * we set ended_at + compute duration_minutes.
 *
 * `quest_id` is a soft reference for now (Phase 3 wires up the FK to
 * lifeos_quests). Phase 9 lets us correlate focus sessions to EC's
 * generations table for the Insights tab.
 */
export const lifeosFocusSessions = pgTable(
  "lifeos_focus_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    label: text("label").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    note: text("note"),
    questId: uuid("quest_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userStartedIdx: index("idx_lifeos_focus_user_started").on(
      table.userId,
      table.startedAt,
    ),
  }),
);

export type LifeosFocusSession = typeof lifeosFocusSessions.$inferSelect;
export type NewLifeosFocusSession = typeof lifeosFocusSessions.$inferInsert;
