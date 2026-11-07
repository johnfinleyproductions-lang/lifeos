import { z } from "zod";
import type { BalanceDimensionKey, BalanceScore } from "./balance";

const reading = z.number().int().min(0).max(10);

/**
 * Balance readings, one per dimension the reviewer actually set.
 *
 * The six sliders used to default to 5 and store that whether or not the
 * thumb ever moved, so an untouched review became six fake readings and
 * the anchor on the Today and Discipline balance cards. Now a dimension
 * is absent until the control is touched, and stays absent if it never
 * was.
 */
export const balanceReadingsSchema = z.object({
  mind: reading.optional(),
  body: reading.optional(),
  work: reading.optional(),
  relationships: reading.optional(),
  play: reading.optional(),
  spirit: reading.optional(),
});

export type BalanceReadings = z.infer<typeof balanceReadingsSchema>;

export const BALANCE_KEYS: BalanceDimensionKey[] = [
  "mind",
  "body",
  "work",
  "relationships",
  "play",
  "spirit",
];

/** The readings that exist, in dimension order. */
export function setReadings(
  r: BalanceReadings,
): { key: BalanceDimensionKey; value: number }[] {
  return BALANCE_KEYS.flatMap((key) => {
    const value = r[key];
    return typeof value === "number" ? [{ key, value }] : [];
  });
}

export const weeklyReviewPayloadSchema = z.object({
  reflect: z.string().max(2000),
  wins: z.string().max(2000),
  questNotes: z.record(z.string(), z.string().max(500)).optional(),
  /*
   * Typed as the full BalanceScore for the readers that predate partial
   * readings (lib/reflection/auto-detect.ts getLatestBalance, the Today
   * BalanceCard, the Discipline page and the coach context all index
   * every key). At runtime a dimension the reviewer never set is ABSENT,
   * not 5 and not 0. Those readers should widen to BalanceReadings and
   * print "not set" for a missing key; until they do, a missing key
   * renders as an empty bar with no number, which is the honest reading.
   */
  balance: balanceReadingsSchema.transform((r) => r as BalanceScore),
  lesson: z.string().max(1000),
  reframe: z.string().max(1000).optional(),
  nextWeekFeel: z.string().max(280),
  nextWeekPriorities: z.array(z.string().min(1).max(140)).max(3),
});

export type WeeklyReviewPayload = z.infer<typeof weeklyReviewPayloadSchema>;

/** Read the readings back from a stored payload without the full-score cast. */
export function readingsOf(payload: WeeklyReviewPayload): BalanceReadings {
  return payload.balance as BalanceReadings;
}
