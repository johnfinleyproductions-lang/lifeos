import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import {
  morningManifestoSchema,
  type MorningManifesto,
} from "@/lib/manifesto/schema";
import {
  eveningShutdownSchema,
  type EveningShutdown,
} from "@/lib/manifesto/evening-schema";

export type RitualDepth = "quick" | "standard" | "deep";

export type TodayCheckin = {
  morning: MorningManifesto | null;
  evening: EveningShutdown | null;
  ritualDepth: RitualDepth;
};

/**
 * Fetch (and parse) today's check-in row for the user.
 *
 * Wrapped in React.cache() so multiple Server Components rendering on the
 * same Today page (ManifestoCard, PlanCard, EveningSummaryCard) only hit
 * the DB once per request. The cache is per-render, not cross-request.
 *
 * Returns sensible defaults when no row exists or when jsonb fails to
 * parse — never throws on missing data.
 */
export const getTodayCheckin = cache(
  async (userId: string): Promise<TodayCheckin> => {
    const today = format(new Date(), "yyyy-MM-dd");

    const rows = await db
      .select({
        morning: lifeosDailyCheckins.morning,
        evening: lifeosDailyCheckins.evening,
        ritualDepth: lifeosDailyCheckins.ritualDepth,
      })
      .from(lifeosDailyCheckins)
      .where(
        and(
          eq(lifeosDailyCheckins.userId, userId),
          eq(lifeosDailyCheckins.entryDate, today),
        ),
      )
      .limit(1);

    const morningRaw = rows[0]?.morning;
    const eveningRaw = rows[0]?.evening;

    const morningParsed =
      morningRaw != null
        ? morningManifestoSchema.safeParse(morningRaw)
        : null;
    const eveningParsed =
      eveningRaw != null
        ? eveningShutdownSchema.safeParse(eveningRaw)
        : null;

    const ritualDepth: RitualDepth =
      rows[0]?.ritualDepth === "quick"
        ? "quick"
        : rows[0]?.ritualDepth === "deep"
          ? "deep"
          : "standard";

    return {
      morning:
        morningParsed && morningParsed.success ? morningParsed.data : null,
      evening:
        eveningParsed && eveningParsed.success ? eveningParsed.data : null,
      ritualDepth,
    };
  },
);
