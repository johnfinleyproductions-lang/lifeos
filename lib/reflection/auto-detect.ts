import { cache } from "react";
import { and, count, desc, eq, gte, isNotNull } from "drizzle-orm";
import { format, startOfDay, subDays } from "date-fns";
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
import { weeklyReviewPayloadSchema } from "./weekly-review-schema";

/**
 * Compute the discipline scorecard for the last 7 days.
 *
 * Pure read functions over LifeOS-owned tables. Wrapped in React.cache so
 * /discipline + /weekly-review can both call this without double-querying.
 */
export type Scorecard = {
  morningDays: number; // 0-7
  eveningDays: number; // 0-7
  habitCompletions: number; // raw count over 7 days
  habitTotal: number; // active habits × 7
  habitPct: number; // 0-100
  focusMinutes: number;
  focusSessions: number;
  questAvgProgress: number; // 0-100, mean of active quests
  activeQuestCount: number;
};

export const getScorecard = cache(
  async (userId: string): Promise<Scorecard> => {
    const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const dayStart = startOfDay(subDays(new Date(), 6));

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

    const [habitCount] = await db
      .select({ value: count() })
      .from(lifeosHabits)
      .where(
        and(
          eq(lifeosHabits.userId, userId),
          eq(lifeosHabits.archived, false),
        ),
      );
    const habitTotal = Number(habitCount?.value ?? 0) * 7;

    const [completionCount] = await db
      .select({ value: count() })
      .from(lifeosHabitCompletions)
      .where(
        and(
          eq(lifeosHabitCompletions.userId, userId),
          gte(lifeosHabitCompletions.completionDate, sevenDaysAgo),
        ),
      );
    const habitCompletions = Number(completionCount?.value ?? 0);
    const habitPct =
      habitTotal > 0 ? Math.round((habitCompletions / habitTotal) * 100) : 0;

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
      focusMinutes,
      focusSessions,
      questAvgProgress,
      activeQuestCount,
    };
  },
);

/**
 * Get the balance score from the most recent weekly_review run.
 */
export const getLatestBalance = cache(
  async (userId: string): Promise<BalanceScore | null> => {
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
    const parsed = weeklyReviewPayloadSchema.safeParse(latest.payload);
    return parsed.success ? parsed.data.balance : null;
  },
);

/**
 * Year heatmap data — last 365 days, marker per day if user did the
 * morning manifesto OR evening shutdown.
 */
export type HeatmapCell = {
  date: string;
  morning: boolean;
  evening: boolean;
};

export const getYearHeatmap = cache(
  async (userId: string): Promise<HeatmapCell[]> => {
    const oneYearAgo = format(subDays(new Date(), 364), "yyyy-MM-dd");
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
    for (let i = 364; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
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
 * Suggested wins from the last 7 days — auto-detected to pre-fill the
 * weekly review's wins prompt. Returns short bullet strings.
 */
export const getSuggestedWins = cache(
  async (userId: string): Promise<string[]> => {
    const wins: string[] = [];
    const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const dayStart = startOfDay(subDays(new Date(), 6));

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
