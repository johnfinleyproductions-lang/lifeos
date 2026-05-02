import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Life Compass — one row per user.
 *
 * Long-arc identity work: mission statement, eulogy ("how do you want to
 * be remembered?"), the user's own definition of success, future-self
 * sketches at multiple time horizons, and the ideal week template.
 *
 * Future paths and ideal week are jsonb so the prompts can evolve without
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
export const lifeosCompass = pgTable(
  "lifeos_compass",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    mission: text("mission"),
    eulogy: text("eulogy"),
    successDefinition: text("success_definition"),
    futurePaths: jsonb("future_paths"),
    idealWeek: jsonb("ideal_week"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userUnique: unique("lifeos_compass_user_unique").on(table.userId),
  }),
);

export type LifeosCompass = typeof lifeosCompass.$inferSelect;
export type NewLifeosCompass = typeof lifeosCompass.$inferInsert;
