import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Reframes shown to the user — supports spaced repetition + dismissal.
 *
 * The reframe library itself is a static text file in code (Phase 5), so
 * `reframe_key` is a slug-style identifier. This table just tracks which
 * reframes the user has seen and when, so we don't show the same reframe
 * three times in a week.
 */
export const lifeosReframesSeen = pgTable(
  "lifeos_reframes_seen",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    reframeKey: text("reframe_key").notNull(),
    shownAt: timestamp("shown_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dismissed: boolean("dismissed").notNull().default(false),
  },
  (table) => ({
    userKeyIdx: index("idx_lifeos_reframes_seen_user_key").on(
      table.userId,
      table.reframeKey,
    ),
    userShownIdx: index("idx_lifeos_reframes_seen_user_shown").on(
      table.userId,
      table.shownAt,
    ),
  }),
);

export type LifeosReframeSeen = typeof lifeosReframesSeen.$inferSelect;
export type NewLifeosReframeSeen = typeof lifeosReframesSeen.$inferInsert;
