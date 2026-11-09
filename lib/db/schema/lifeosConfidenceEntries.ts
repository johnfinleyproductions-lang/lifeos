import { table, id, owner, text, timestamp } from "../table";

/**
 * Confidence file — evidence of who you're becoming.
 *
 * `kind` distinguishes manual vs auto-collected:
 *   - 'manual'         user wrote it directly on the Identity page
 *   - 'auto_protocol'  came from a Daily Confidence protocol run
 *   - 'auto_focus'     a focus session of >=45 min completed (Phase 9 rule)
 *   - 'auto_build_log' a build-log entry matched a priority keyword (Phase 9)
 *   - 'auto_rating'    a generation was rated >=4 (Phase 9)
 *
 * `source` is a free-text reference (a uuid pointing at the relevant row,
 * or just a context string). Loose rather than FK because sources span
 * multiple tables and even other apps.
 */
export const lifeosConfidenceEntries = table(
  "lifeos_confidence_entries",
  {
    id: id(),
    userId: owner().notNull(),
    kind: text("kind").notNull().default("manual"),
    source: text("source"),
    title: text("title").notNull(),
    body: text("body"),
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  });

export type LifeosConfidenceEntry =
  typeof lifeosConfidenceEntries.$inferSelect;
export type NewLifeosConfidenceEntry =
  typeof lifeosConfidenceEntries.$inferInsert;
