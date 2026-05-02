import { z } from "zod";

/**
 * v3 export format — accepts a flexible shape since v3's localStorage
 * schema may have evolved across releases. The strict guarantees:
 *
 * - `entries` is an array, max 1000 (sanity cap)
 * - each entry has a YYYY-MM-DD date
 * - `morning` and `evening` are passed through as opaque jsonb
 *
 * Field-level validation against the v4 schemas happens at READ time
 * (Today renders use safeParse — invalid v3 fields render the empty
 * state without breaking the page).
 */
export const v3EntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  morning: z.record(z.string(), z.unknown()).nullable().optional(),
  evening: z.record(z.string(), z.unknown()).nullable().optional(),
  ritualDepth: z.enum(["quick", "standard", "deep"]).optional(),
});

export const v3ImportSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  entries: z.array(v3EntrySchema).min(1).max(1000),
});

export type V3Entry = z.infer<typeof v3EntrySchema>;
export type V3Import = z.infer<typeof v3ImportSchema>;
