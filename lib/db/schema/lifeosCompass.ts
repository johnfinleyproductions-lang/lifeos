import { table, id, owner, text, timestamp, json } from "../table";

/**
 * Life Compass — one row per user.
 *
 * Long-arc identity work: mission statement, eulogy ("how do you want to
 * be remembered?"), the user's own definition of success, future-self
 * sketches at multiple time horizons, and the ideal week template.
 *
 * Future paths and ideal week are JSON (stored as text) so the prompts can evolve without
 * DDL churn:
 *
 *   future_paths = {
 *     oneYear: "...", threeYear: "...", fiveYear: "...", tenYear: "..."
 *   }
 *
 *   ideal_week = {
 *     monday:    { anchors: ["..."], blocks: [{ time, name }] },
 *     tuesday:   { ... },
 *     ...
 *   }
 *
 * Compass UI lives in Phase 3 batch 13 (this schema lands in batch 12 so
 * we only run the migration once for both quests + compass).
 */
export const lifeosCompass = table(
  "lifeos_compass",
  {
    id: id(),
    userId: owner().notNull(),
    mission: text("mission"),
    eulogy: text("eulogy"),
    successDefinition: text("success_definition"),
    futurePaths: json("future_paths"),
    idealWeek: json("ideal_week"),
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow(),
  });

export type LifeosCompass = typeof lifeosCompass.$inferSelect;
export type NewLifeosCompass = typeof lifeosCompass.$inferInsert;
