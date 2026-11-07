import { z } from "zod";
import {
  ZERO_BALANCE,
  type BalanceDimensionKey,
  type BalanceScore,
} from "./balance";

const reading = z.number().int().min(0).max(10);

/**
 * Balance readings, one per dimension the reviewer actually set.
 *
 * The six sliders used to default to 5 and store that as a reading
 * whether or not the thumb ever moved, so an untouched review became six
 * fake readings and the anchor on the Today and Discipline balance cards.
 * Now a dimension is absent until the control is touched, and stays
 * absent if it never was.
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

const fields = {
  reflect: z.string().max(2000),
  wins: z.string().max(2000),
  questNotes: z.record(z.string(), z.string().max(500)).optional(),
  lesson: z.string().max(1000),
  reframe: z.string().max(1000).optional(),
  nextWeekFeel: z.string().max(280),
  nextWeekPriorities: z.array(z.string().min(1).max(140)).max(3),
};

/**
 * What is stored: the readings that were taken, nothing for the rest.
 * The POST route validates with this and writes the result as-is.
 */
export const weeklyReviewInputSchema = z.object({
  ...fields,
  balance: balanceReadingsSchema,
});

export type WeeklyReviewInput = z.infer<typeof weeklyReviewInputSchema>;

/**
 * What is read: the same row, with `balance` widened to the full score
 * for the readers that predate partial readings (getLatestBalance in
 * lib/reflection/auto-detect.ts, the Today BalanceCard, the Discipline
 * page, the coach context). A dimension that was never set reads as 0
 * there, which draws an empty bar. Those readers should move to
 * `balanceReadingsSchema` / `setReadings` and print "not set" instead;
 * the past-reviews page already does.
 */
export const weeklyReviewPayloadSchema = z.object({
  ...fields,
  balance: balanceReadingsSchema.transform(
    (r): BalanceScore => ({ ...ZERO_BALANCE, ...setReadingsRecord(r) }),
  ),
});

export type WeeklyReviewPayload = z.infer<typeof weeklyReviewPayloadSchema>;

function setReadingsRecord(r: BalanceReadings): Partial<BalanceScore> {
  const out: Partial<BalanceScore> = {};
  for (const { key, value } of setReadings(r)) out[key] = value;
  return out;
}
