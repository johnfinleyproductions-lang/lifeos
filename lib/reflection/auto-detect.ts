import { cache } from "react";
import { and, count, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { addDays, lastNDays, startOfDay, todayKey } from "@/lib/time/day";
import {
  phraseSum,
  sumTallies,
  tallyHabit,
  type HabitTally,
} from "@/lib/insights/habit-denominator";
import { db } from "@/lib/db";
import {
  lifeosDailyCheckins,
  lifeosFocusSessions,
  lifeosHabits,
  lifeosHabitCompletions,
  lifeosQuests,
  lifeosProtocolRuns,
} from "@/lib/db/schema/lifeos";
import { type BalanceScore, ZERO_BALANCE } from "./balance";
import {
  weeklyReviewInputSchema,
  weeklyReviewPayloadSchema,
} from "./weekly-review-schema";

/**
 * Compute the scorecard for the last 7 days.
 *
 * Pure read functions over LifeOS-owned tables. Wrapped in React.cache so
 * /insights and /weekly-review can both call this without double-querying.
 *
 * The habit numbers are honest ones. `habitTotal` used to be active
 * habits x 7, which counted a weekly habit as seven misses a week and a
 * habit created this morning as six misses before it existed. It is
 * now the sum of each habit's possible days (or weeks) by its cadence
 * and its creation date, and `habitCompletions` is how many of those
 * were kept. The field names are kept so the weekly review and the
 * coach's context read the same shape; only the arithmetic changed.
 */
export type Scorecard = {
  morningDays: number; // 0-7
  eveningDays: number; // 0-7
  habitCompletions: number; // pressings on days the cadence asked for
  habitTotal: number; // days (or weeks) the cadences asked for
  habitPct: number; // 0-100, kept over possible; 0 when nothing was possible
  /** per-habit tallies, oldest habit first */
  habits: { id: string; name: string; tally: HabitTally }[];
  /** the headline phrasing: value, unit, and the line under it */
  habitPhrase: { value: string; unit?: string; foot: string };
  /** true when the habits are counted in different units (days and weeks) */
  habitMixedUnits: boolean;
  focusMinutes: number;
  focusSessions: number;
  questAvgProgress: number; // 0-100, mean of active quests
  activeQuestCount: number;
};

export const getScorecard = cache(
  async (userId: string): Promise<Scorecard> => {
    const sevenDaysAgo = addDays(todayKey(), -6);
    const dayStart = startOfDay(sevenDaysAgo);

    const checkins = await db
      .select({
        entryDate: lifeosDailyCheckins.entryDate,
        morning: lifeosDailyCheckins.morning,
        evening: lifeosDailyCheckins.evening,
      })
      .from(lifeosDailyCheckins)
      .where(
        and(
          eq(lifeosDailyCheckins.userId, userId),
          gte(lifeosDailyCheckins.entryDate, sevenDaysAgo),
        ),
      );

    const morningDays = checkins.filter((c) => c.morning != null).length;
    const eveningDays = checkins.filter((c) => c.evening != null).length;

    const days = lastNDays(7, todayKey());
    const habitRows = await db
      .select({
        id: lifeosHabits.id,
        name: lifeosHabits.name,
        cadence: lifeosHabits.cadence,
        createdAt: lifeosHabits.createdAt,
      })
      .from(lifeosHabits)
      .where(
        and(
          eq(lifeosHabits.userId, userId),
          eq(lifeosHabits.archived, false),
        ),
      )
      .orderBy(lifeosHabits.createdAt);

    const completionRows =
      habitRows.length > 0
        ? await db
            .select({
              habitId: lifeosHabitCompletions.habitId,
              date: lifeosHabitCompletions.completionDate,
            })
            .from(lifeosHabitCompletions)
            .where(
              and(
                inArray(
                  lifeosHabitCompletions.habitId,
                  habitRows.map((h) => h.id),
                ),
                gte(lifeosHabitCompletions.completionDate, sevenDaysAgo),
              ),
            )
        : [];
    const byHabit = new Map<string, Set<string>>();
    for (const c of completionRows) {
      if (!byHabit.has(c.habitId)) byHabit.set(c.habitId, new Set());
      byHabit.get(c.habitId)!.add(c.date);
    }
    const habits = habitRows.map((h) => ({
      id: h.id,
      name: h.name,
      tally: tallyHabit(
        days,
        h.cadence,
        h.createdAt,
        byHabit.get(h.id) ?? new Set(),
      ),
    }));
    const tallies = habits.map((h) => h.tally);
    const sum = sumTallies(tallies);
    const habitCompletions = sum.kept;
    const habitTotal = sum.possible;
    const habitPct =
      habitTotal > 0 ? Math.round((habitCompletions / habitTotal) * 100) : 0;
    const habitPhrase = phraseSum(tallies, 7);

    const focus = await db
      .select({
        durationMinutes: lifeosFocusSessions.durationMinutes,
      })
      .from(lifeosFocusSessions)
      .where(
        and(
          eq(lifeosFocusSessions.userId, userId),
          isNotNull(lifeosFocusSessions.endedAt),
          gte(lifeosFocusSessions.startedAt, dayStart),
        ),
      );
    const focusMinutes = focus.reduce(
      (sum, f) => sum + (f.durationMinutes ?? 0),
      0,
    );
    const focusSessions = focus.length;

    const quests = await db
      .select({ progress: lifeosQuests.progress })
      .from(lifeosQuests)
      .where(
        and(
          eq(lifeosQuests.userId, userId),
          eq(lifeosQuests.archived, false),
        ),
      );
    const activeQuestCount = quests.length;
    const questAvgProgress =
      activeQuestCount > 0
        ? Math.round(
            quests.reduce((s, q) => s + q.progress, 0) / activeQuestCount,
          )
        : 0;

    return {
      morningDays,
      eveningDays,
      habitCompletions,
      habitTotal,
      habitPct,
      habits,
      habitPhrase,
      habitMixedUnits: sum.mixed,
      focusMinutes,
      focusSessions,
      questAvgProgress,
      activeQuestCount,
    };
  },
);

/**
 * The readings from the most recent weekly review, and only the readings
 * actually taken.
 *
 * The six sliders used to default to 5 and store whether or not anyone
 * touched them, so an untouched review became the anchor on two pages.
 * They are partial now, and this returns them partial: a dimension nobody
 * read has no value, rather than a 0 that draws an empty bar and reads as
 * "your mind scored zero". Callers must handle undefined.
 */
export const getLatestBalance = cache(
  async (userId: string): Promise<Partial<BalanceScore> | null> => {
    const [latest] = await db
      .select()
      .from(lifeosProtocolRuns)
      .where(
        and(
          eq(lifeosProtocolRuns.userId, userId),
          eq(lifeosProtocolRuns.slug, "weekly_review"),
        ),
      )
      .orderBy(desc(lifeosProtocolRuns.createdAt))
      .limit(1);

    if (!latest?.payload) return null;
    const parsed = weeklyReviewInputSchema.safeParse(latest.payload);
    return parsed.success ? parsed.data.balance : null;
  },
);

/**
 * Year heatmap data: last 365 days, marker per day if user did the
 * morning manifesto OR evening shutdown.
 */
export type HeatmapCell = {
  date: string;
  morning: boolean;
  evening: boolean;
};

export const getYearHeatmap = cache(
  async (userId: string): Promise<HeatmapCell[]> => {
    const today = todayKey();
    const oneYearAgo = addDays(today, -364);
    const rows = await db
      .select({
        entryDate: lifeosDailyCheckins.entryDate,
        morning: lifeosDailyCheckins.morning,
        evening: lifeosDailyCheckins.evening,
      })
      .from(lifeosDailyCheckins)
      .where(
        and(
          eq(lifeosDailyCheckins.userId, userId),
          gte(lifeosDailyCheckins.entryDate, oneYearAgo),
        ),
      );

    const byDate = new Map<string, { morning: boolean; evening: boolean }>();
    for (const r of rows) {
      byDate.set(r.entryDate, {
        morning: r.morning != null,
        evening: r.evening != null,
      });
    }

    const cells: HeatmapCell[] = [];
    for (const d of lastNDays(365, today)) {
      const hit = byDate.get(d);
      cells.push({
        date: d,
        morning: hit?.morning ?? false,
        evening: hit?.evening ?? false,
      });
    }
    return cells;
  },
);

/**
 * Suggested wins from the last 7 days, auto-detected to pre-fill the
 * weekly review's wins prompt. Returns short bullet strings.
 */
export const getSuggestedWins = cache(
  async (userId: string): Promise<string[]> => {
    const wins: string[] = [];
    const sevenDaysAgo = addDays(todayKey(), -6);
    const dayStart = startOfDay(sevenDaysAgo);

    // Completed quests in the last week
    const completedQuests = await db
      .select({ title: lifeosQuests.title })
      .from(lifeosQuests)
      .where(
        and(
          eq(lifeosQuests.userId, userId),
          eq(lifeosQuests.status, "completed"),
        ),
      );
    for (const q of completedQuests.slice(0, 3)) {
      wins.push(`Completed quest: ${q.title}`);
    }

    // Focus minutes
    const focus = await db
      .select({
        durationMinutes: lifeosFocusSessions.durationMinutes,
      })
      .from(lifeosFocusSessions)
      .where(
        and(
          eq(lifeosFocusSessions.userId, userId),
          isNotNull(lifeosFocusSessions.endedAt),
          gte(lifeosFocusSessions.startedAt, dayStart),
        ),
      );
    const totalMinutes = focus.reduce(
      (s, f) => s + (f.durationMinutes ?? 0),
      0,
    );
    if (totalMinutes >= 60) {
      wins.push(
        `${Math.round(totalMinutes / 60)} hours of focused work across ${focus.length} sessions`,
      );
    }

    // Habit streaks
    const [completionCount] = await db
      .select({ value: count() })
      .from(lifeosHabitCompletions)
      .where(
        and(
          eq(lifeosHabitCompletions.userId, userId),
          gte(lifeosHabitCompletions.completionDate, sevenDaysAgo),
        ),
      );
    const habitN = Number(completionCount?.value ?? 0);
    if (habitN > 0) {
      wins.push(`Hit habits ${habitN} times this week`);
    }

    return wins;
  },
);

export const _balance_zero: BalanceScore = ZERO_BALANCE;
