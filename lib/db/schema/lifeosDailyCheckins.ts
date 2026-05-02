import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  date,
  jsonb,
  text,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";

/**
 * Daily check-ins — one row per (user, entry_date).
 *
 * - `morning` and `evening` are jsonb so the wizard schemas can evolve
 *   without DDL migrations. Validate at the API layer with zod.
 * - `ritual_depth` controls quick / standard / deep prompt sets.
 * - No FK to `user(id)` or `workspaces(id)` on purpose. EC owns those tables;
 *   LifeOS treats user_id and workspace_id as soft references (indexed,
 *   uuid-typed, but unconstrained). Keeps cross-app coupling loose.
 *
 * Spec: §2.2 (Core tables).
 */
export const lifeosDailyCheckins = pgTable(
  "lifeos_daily_checkins",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workspaceId: uuid("workspace_id").notNull(),
    userId: uuid("user_id").notNull(),
    entryDate: date("entry_date").notNull(),
    morning: jsonb("morning"),
    evening: jsonb("evening"),
    ritualDepth: text("ritual_depth").notNull().default("standard"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userDateUnique: unique("lifeos_daily_checkins_user_date_unique").on(
      table.userId,
      table.entryDate,
    ),
    userDateIdx: index("idx_lifeos_checkins_user_date").on(
      table.userId,
      table.entryDate,
    ),
    workspaceDateIdx: index("idx_lifeos_checkins_workspace_date").on(
      table.workspaceId,
      table.entryDate,
    ),
  }),
);

export type LifeosDailyCheckin = typeof lifeosDailyCheckins.$inferSelect;
export type NewLifeosDailyCheckin = typeof lifeosDailyCheckins.$inferInsert;
