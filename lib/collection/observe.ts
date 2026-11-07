import { cache } from "react";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import {
  lifeosCompass,
  lifeosConfidenceEntries,
  lifeosDailyCheckins,
  lifeosFocusSessions,
  lifeosHabitCompletions,
  lifeosProtocolRuns,
  lifeosQuests,
} from "@/lib/db/schema/lifeos";
import { PROTOCOLS } from "@/lib/protocols/definitions";
import { CATALOGUE, type Specimen } from "./catalogue";

/**
 * Reads the collection straight off the tables the app already keeps.
 *
 * Nothing is written. A specimen's date is the date the underlying row
 * was logged, so the collection is always exactly as true as the log,
 * and deleting a habit or archiving a quest changes it the way it would
 * change any other read of the data.
 *
 * The journal is not read. Not the entries, not the decision flags, not
 * the open loops. The journal is private writing and the collection has
 * no business in it.
 *
 * One parallel round of seven small queries. Wrapped in React.cache so
 * Today and the collection page share a result within a request.
 */

export type Observation = {
  /** yyyy-MM-dd, local, or null if never recorded */
  firstObs: string | null;
  /** running total for the specimens that keep counting; null for one-time milestones */
  count: number | null;
};

export type Recorded = Specimen & Observation & { today: boolean };

export type Collection = {
  specimens: Recorded[];
  recorded: number;
  total: number;
  newToday: Recorded[];
};

const day = (d: Date | string) =>
  typeof d === "string" ? d.slice(0, 10) : format(d, "yyyy-MM-dd");

/** The date at which a sorted list of dates reaches its nth entry. */
const nth = (dates: string[], n: number): string | null =>
  dates.length >= n ? dates[n - 1] : null;

const first = (dates: string[]): string | null =>
  dates.length > 0 ? dates[0] : null;

export const getCollection = cache(
  async (userId: string): Promise<Collection> => {
    const [checkins, completions, focus, quests, runs, confidence, compass] =
      await Promise.all([
        db
          .select({
            date: lifeosDailyCheckins.entryDate,
            morning: sql<boolean>`${lifeosDailyCheckins.morning} is not null`,
            evening: sql<boolean>`${lifeosDailyCheckins.evening} is not null`,
            rating: sql<
              string | null
            >`${lifeosDailyCheckins.evening}->>'dayRating'`,
          })
          .from(lifeosDailyCheckins)
          .where(eq(lifeosDailyCheckins.userId, userId))
          .orderBy(asc(lifeosDailyCheckins.entryDate)),

        db
          .select({ date: lifeosHabitCompletions.completionDate })
          .from(lifeosHabitCompletions)
          .where(eq(lifeosHabitCompletions.userId, userId))
          .orderBy(asc(lifeosHabitCompletions.completionDate)),

        db
          .select({
            startedAt: lifeosFocusSessions.startedAt,
            minutes: lifeosFocusSessions.durationMinutes,
          })
          .from(lifeosFocusSessions)
          .where(
            and(
              eq(lifeosFocusSessions.userId, userId),
              isNotNull(lifeosFocusSessions.endedAt),
            ),
          )
          .orderBy(asc(lifeosFocusSessions.startedAt)),

        db
          .select({
            createdAt: lifeosQuests.createdAt,
            updatedAt: lifeosQuests.updatedAt,
            endDate: lifeosQuests.endDate,
            status: lifeosQuests.status,
          })
          .from(lifeosQuests)
          .where(eq(lifeosQuests.userId, userId))
          .orderBy(asc(lifeosQuests.createdAt)),

        db
          .select({
            slug: lifeosProtocolRuns.slug,
            date: lifeosProtocolRuns.runDate,
          })
          .from(lifeosProtocolRuns)
          .where(eq(lifeosProtocolRuns.userId, userId))
          .orderBy(asc(lifeosProtocolRuns.runDate)),

        db
          .select({ createdAt: lifeosConfidenceEntries.createdAt })
          .from(lifeosConfidenceEntries)
          .where(eq(lifeosConfidenceEntries.userId, userId))
          .orderBy(asc(lifeosConfidenceEntries.createdAt)),

        db
          .select({
            createdAt: lifeosCompass.createdAt,
            updatedAt: lifeosCompass.updatedAt,
            mission: lifeosCompass.mission,
          })
          .from(lifeosCompass)
          .where(eq(lifeosCompass.userId, userId))
          .limit(1),
      ]);

    // ---- the rituals ----
    const mornings = checkins.filter((c) => c.morning).map((c) => day(c.date));
    const evenings = checkins.filter((c) => c.evening).map((c) => day(c.date));
    const fullDays = checkins
      .filter((c) => c.morning && c.evening)
      .map((c) => day(c.date));
    const alive = checkins
      .filter((c) => c.evening && c.rating === "5")
      .map((c) => day(c.date));

    // ---- pressings ----
    const pressings = completions.map((c) => day(c.date));

    // ---- the hide ----
    const longSits = focus
      .filter((f) => (f.minutes ?? 0) >= 45)
      .map((f) => day(f.startedAt));
    let running = 0;
    let tenHours: string | null = null;
    let hundredHours: string | null = null;
    for (const f of focus) {
      running += f.minutes ?? 0;
      if (tenHours === null && running >= 600) tenHours = day(f.startedAt);
      if (hundredHours === null && running >= 6000) {
        hundredHours = day(f.startedAt);
        break;
      }
    }

    // ---- the range ----
    const questsSet = quests.map((q) => day(q.createdAt));
    const summits = quests
      .filter((q) => q.status === "completed")
      .map((q) => (q.endDate ? day(q.endDate) : day(q.updatedAt)))
      .sort();

    // ---- looking back ----
    const reviews = runs
      .filter((r) => r.slug === "weekly_review")
      .map((r) => day(r.date));
    const protocolSlugs = new Set(PROTOCOLS.map((p) => p.slug));
    const protocolRuns = runs
      .filter((r) => protocolSlugs.has(r.slug))
      .map((r) => ({ slug: r.slug, date: day(r.date) }));
    const firstBySlug = new Map<string, string>();
    for (const r of protocolRuns) {
      if (!firstBySlug.has(r.slug)) firstBySlug.set(r.slug, r.date);
    }
    const fullSet =
      firstBySlug.size === protocolSlugs.size
        ? [...firstBySlug.values()].sort().at(-1) ?? null
        : null;
    const filed = confidence.map((c) => day(c.createdAt));
    const compassRow = compass[0];
    const compassSet =
      compassRow && compassRow.mission && compassRow.mission.trim().length > 0
        ? day(compassRow.createdAt)
        : null;

    const observed: Record<string, Observation> = {
      morning: { firstObs: first(mornings), count: mornings.length },
      evening: { firstObs: first(evenings), count: evenings.length },
      fullday: { firstObs: first(fullDays), count: fullDays.length },
      alive: { firstObs: first(alive), count: alive.length },
      "thirty-fulldays": { firstObs: nth(fullDays, 30), count: null },

      pressing: { firstObs: first(pressings), count: pressings.length },
      "hundred-pressings": { firstObs: nth(pressings, 100), count: null },
      "thousand-pressings": { firstObs: nth(pressings, 1000), count: null },

      "long-sit": { firstObs: first(longSits), count: longSits.length },
      "ten-hours": { firstObs: tenHours, count: null },
      "hundred-hours": { firstObs: hundredHours, count: null },

      quest: { firstObs: first(questsSet), count: questsSet.length },
      summit: { firstObs: first(summits), count: summits.length },
      "three-summits": { firstObs: nth(summits, 3), count: null },

      review: { firstObs: first(reviews), count: reviews.length },
      protocol: {
        firstObs: first(protocolRuns.map((r) => r.date)),
        count: protocolRuns.length,
      },
      "full-set": { firstObs: fullSet, count: null },
      confidence: { firstObs: first(filed), count: filed.length },
      compass: { firstObs: compassSet, count: null },
    };

    const today = format(new Date(), "yyyy-MM-dd");
    const specimens: Recorded[] = CATALOGUE.map((s) => {
      const o = observed[s.key] ?? { firstObs: null, count: null };
      return { ...s, ...o, today: o.firstObs === today };
    });

    return {
      specimens,
      recorded: specimens.filter((s) => s.firstObs !== null).length,
      total: specimens.length,
      newToday: specimens.filter((s) => s.today),
    };
  },
);
