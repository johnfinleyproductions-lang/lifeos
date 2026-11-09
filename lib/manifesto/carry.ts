import { and, desc, eq, gt, isNotNull, lt } from "@/lib/db/ops";
import { addDays, daysBetween, formatDay, todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import {
  lifeosDailyCheckins,
  lifeosProtocolRuns,
} from "@/lib/db/schema";
import { eveningShutdownSchema } from "./evening-schema";
import { weeklyReviewPayloadSchema } from "@/lib/reflection/weekly-review-schema";

/**
 * What the morning inherits.
 *
 * The rituals used to ask for things and never show them again: the
 * evening's "tomorrow's seed" and the weekly review's three priorities for
 * next week were written and then only ever stored. This module reads
 * them back for the morning wizard, which prints each as a pre-filled,
 * strikeable line on the priorities card.
 *
 *  - The seed comes from yesterday's evening row. Only yesterday's: a seed
 *    from three nights ago is stale, and the morning should not nag.
 *  - The review's three surface on the first morning after the review:
 *    the latest weekly_review run, provided no morning has been written
 *    between the run date and today. After one morning has seen them,
 *    they are planted and stop appearing. Reviews older than nine days
 *    never surface; by then it is a different week.
 */
export type CarriedLine = {
  text: string;
  /** Short source label, printed above the line: "From last night". */
  from: string;
  source: "evening" | "review";
};

export async function getCarriedLines(userId: string): Promise<CarriedLine[]> {
  const today = todayKey();
  const yesterday = addDays(today, -1);
  const lines: CarriedLine[] = [];

  const [lastNight] = await db
    .select({ evening: lifeosDailyCheckins.evening })
    .from(lifeosDailyCheckins)
    .where(
      and(
        eq(lifeosDailyCheckins.userId, userId),
        eq(lifeosDailyCheckins.entryDate, yesterday),
      ),
    )
    .limit(1);

  if (lastNight?.evening != null) {
    const parsed = eveningShutdownSchema.safeParse(lastNight.evening);
    if (parsed.success && parsed.data.tomorrowSeed.trim()) {
      lines.push({
        text: parsed.data.tomorrowSeed.trim(),
        from: "From last night",
        source: "evening",
      });
    }
  }

  const [review] = await db
    .select({
      runDate: lifeosProtocolRuns.runDate,
      payload: lifeosProtocolRuns.payload,
    })
    .from(lifeosProtocolRuns)
    .where(
      and(
        eq(lifeosProtocolRuns.userId, userId),
        eq(lifeosProtocolRuns.slug, "weekly_review"),
      ),
    )
    .orderBy(desc(lifeosProtocolRuns.runDate), desc(lifeosProtocolRuns.createdAt))
    .limit(1);

  if (review && daysBetween(review.runDate, today) <= 9) {
    const parsed = weeklyReviewPayloadSchema.safeParse(review.payload);
    if (parsed.success && parsed.data.nextWeekPriorities.length > 0) {
      // Has any morning already been written since the review? If so the
      // three were planted that day and should not come up again.
      const [seen] = await db
        .select({ id: lifeosDailyCheckins.id })
        .from(lifeosDailyCheckins)
        .where(
          and(
            eq(lifeosDailyCheckins.userId, userId),
            isNotNull(lifeosDailyCheckins.morning),
            gt(lifeosDailyCheckins.entryDate, review.runDate),
            lt(lifeosDailyCheckins.entryDate, today),
          ),
        )
        .limit(1);

      if (!seen) {
        const from =
          review.runDate === today
            ? "From today's review"
            : review.runDate === yesterday
              ? "From yesterday's review"
              : `From ${formatDay(review.runDate, "EEEE")}'s review`;
        for (const p of parsed.data.nextWeekPriorities) {
          lines.push({ text: p, from, source: "review" });
        }
      }
    }
  }

  return lines;
}
