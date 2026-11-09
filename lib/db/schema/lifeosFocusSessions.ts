import { table, id, owner, ref, text, integer, timestamp } from "../table";

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
export const lifeosFocusSessions = table(
  "lifeos_focus_sessions",
  {
    id: id(),
    userId: owner().notNull(),
    label: text("label").notNull(),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at"),
    durationMinutes: integer("duration_minutes"),
    note: text("note"),
    questId: ref("quest_id"),
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  });

export type LifeosFocusSession = typeof lifeosFocusSessions.$inferSelect;
export type NewLifeosFocusSession = typeof lifeosFocusSessions.$inferInsert;
