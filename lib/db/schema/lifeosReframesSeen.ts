import { table, id, owner, text, boolean, timestamp } from "../table";

/**
 * Reframes shown to the user — supports spaced repetition + dismissal.
 *
 * The reframe library itself is a static text file in code (Phase 5), so
 * `reframe_key` is a slug-style identifier. This table just tracks which
 * reframes the user has seen and when, so we don't show the same reframe
 * three times in a week.
 */
export const lifeosReframesSeen = table(
  "lifeos_reframes_seen",
  {
    id: id(),
    userId: owner().notNull(),
    reframeKey: text("reframe_key").notNull(),
    shownAt: timestamp("shown_at")
      .notNull()
      .defaultNow(),
    dismissed: boolean("dismissed").notNull().default(false),
  });

export type LifeosReframeSeen = typeof lifeosReframesSeen.$inferSelect;
export type NewLifeosReframeSeen = typeof lifeosReframesSeen.$inferInsert;
