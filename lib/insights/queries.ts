import { cache } from "react";
import { and, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { format, startOfDay, subDays } from "date-fns";
import { db } from "@/lib/db";
import {
  lifeosDailyCheckins,
  lifeosFocusSessions,
  lifeosHabits,
  lifeosHabitCompletions,
  lifeosJournalEntries,
} from "@/lib/db/schema/lifeos";
import { morningManifestoSchema } from "@/lib/manifesto/schema";
import { eveningShutdownSchema } from "@/lib/manifesto/evening-schema";

export type DayPoint = {
  date: string;
  morningEnergy: number | null;
  morningMood: string | null;
  eveningRating: number | null;
  eveningMood: string | null;
  focusMinutes: number;
};

export type HabitWithCompletions = {
  id: string;
  name: string;
  completions: Set<string>;
};

export type InsightsData = {
  windowDays: number;
  startDate: string;
  endDate: string;
  days: string[];
  dayPoints: DayPoint[];
  habits: HabitWithCompletions[];
  totalFocusMinutes: number;
  totalFocusSessions: number;
  decisionCount: number;
  morningCheckins: number;
  eveningCheckins: number;
};

/**
 * Aggregate the user's last N days of LifeOS data for the Insights view.
 *
 * Pulls from check-ins, habits + completions, focus sessions, and journal
 * decisions. All scoped to the user_id (current profile).
 *
 * Wrapped in React.cache so the page + each visualization can re-call it
 * without doubling the DB load.
 */
export const getInsights = cache(
  async (userId: string, windowDays = 30): Promise<InsightsData> => {
    const today = new Date();
    const startDate = format(subDays(today, windowDays - 1), "yyyy-MM-dd");
    const endDate = format(today, "yyyy-MM-dd");
    const dayStart = startOfDay(subDays(today, windowDays - 1));

    const days: string[] = [];
    for (let i = windowDays - 1; i >= 0; i--) {
      days.push(format(subDays(today, i), "yyyy-MM-dd"));
    }

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
          gte(lifeosDailyCheckins.entryDate, startDate),
        ),
      );

    const focusRows = await db
      .select({
        startedAt: lifeosFocusSessions.startedAt,
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

    const checkinByDate = new Map<
      string,
      { morning?: unknown; evening?: unknown }
    >();
    for (const c of checkins) {
      checkinByDate.set(c.entryDate, {
        morning: c.morning ?? undefined,
        evening: c.evening ?? undefined,
      });
    }

    const focusByDate = new Map<string, number>();
    for (const f of focusRows) {
      const date = format(f.startedAt, "yyyy-MM-dd");
      focusByDate.set(
        date,
        (focusByDate.get(date) ?? 0) + (f.durationMinutes ?? 0),
      );
    }

    const dayPoints: DayPoint[] = days.map((date) => {
      const c = checkinByDate.get(date);
      const morningParsed = c?.morning
        ? morningManifestoSchema.safeParse(c.morning)
        : null;
      const eveningParsed = c?.evening
        ? eveningShutdownSchema.safeParse(c.evening)
        : null;
      return {
        date,
        morningEnergy:
          morningParsed && morningParsed.success
            ? morningParsed.data.energy
            : null,
        morningMood:
          morningParsed && morningParsed.success
            ? morningParsed.data.mood
            : null,
        eveningRating:
          eveningParsed && eveningParsed.success
            ? eveningParsed.data.dayRating
            : null,
        eveningMood:
          eveningParsed && eveningParsed.success
            ? eveningParsed.data.dayMood
            : null,
        focusMinutes: focusByDate.get(date) ?? 0,
      };
    });

    const habitRows = await db
      .select()
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
            .select()
            .from(lifeosHabitCompletions)
            .where(
              and(
                inArray(
                  lifeosHabitCompletions.habitId,
                  habitRows.map((h) => h.id),
                ),
                gte(lifeosHabitCompletions.completionDate, startDate),
              ),
            )
        : [];

    const completionsByHabit = new Map<string, Set<string>>();
    for (const c of completionRows) {
      if (!completionsByHabit.has(c.habitId)) {
        completionsByHabit.set(c.habitId, new Set());
      }
      completionsByHabit.get(c.habitId)!.add(c.completionDate);
    }

    const habits: HabitWithCompletions[] = habitRows.map((h) => ({
      id: h.id,
      name: h.name,
      completions: completionsByHabit.get(h.id) ?? new Set(),
    }));

    const decisionRows = await db
      .select({ id: lifeosJournalEntries.id })
      .from(lifeosJournalEntries)
      .where(
        and(
          eq(lifeosJournalEntries.userId, userId),
          eq(lifeosJournalEntries.isDecision, true),
          gte(lifeosJournalEntries.entryDate, startDate),
        ),
      );

    return {
      windowDays,
      startDate,
      endDate,
      days,
      dayPoints,
      habits,
      totalFocusMinutes: focusRows.reduce(
        (s, f) => s + (f.durationMinutes ?? 0),
        0,
      ),
      totalFocusSessions: focusRows.length,
      decisionCount: decisionRows.length,
      morningCheckins: dayPoints.filter((p) => p.morningEnergy !== null)
        .length,
      eveningCheckins: dayPoints.filter((p) => p.eveningRating !== null)
        .length,
    };
  },
);
