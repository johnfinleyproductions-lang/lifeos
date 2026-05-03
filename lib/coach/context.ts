import { cache } from "react";
import { and, desc, eq, ne } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import {
  lifeosDailyCheckins,
  lifeosQuests,
  lifeosConfidenceEntries,
} from "@/lib/db/schema/lifeos";
import { morningManifestoSchema } from "@/lib/manifesto/schema";
import { eveningShutdownSchema } from "@/lib/manifesto/evening-schema";
import {
  getScorecard,
  getLatestBalance,
  type Scorecard,
} from "@/lib/reflection/auto-detect";
import { quarterProgress } from "@/lib/quests/quarter";
import type { BalanceScore } from "@/lib/reflection/balance";

/**
 * Coach context — everything the AI gets to see about the user's data.
 *
 * ⚠️  ISOLATION RULE (spec §2.4): NEVER read from `lifeos_journal_entries`
 * or `lifeos_open_loops` here. Journal data is private writing space —
 * the coach must not have access. The grep test for this file passing the
 * isolation discipline: `lifeosJournal` and `lifeosOpenLoops` should not
 * appear anywhere in this module.
 */

export type CoachContext = {
  identityStatement: string | null;
  todayMorning: {
    manifesto: string;
    energy: number;
    mood: string;
    priorities: string[];
    protect: string;
    gratitude: string;
  } | null;
  todayEvening: {
    dayRating: number;
    dayMood: string;
    win: string;
    lesson: string;
    tomorrowSeed: string;
  } | null;
  activeQuests: {
    title: string;
    domain: string;
    type: string;
    progress: number;
  }[];
  scorecard: Scorecard;
  balance: BalanceScore | null;
  recentConfidence: { title: string; body: string | null; createdAt: string }[];
  quarterPhase: string;
  quarterDay: number;
  quarterTotalDays: number;
};

export const getCoachContext = cache(
  async (userId: string): Promise<CoachContext> => {
    const today = format(new Date(), "yyyy-MM-dd");

    // Latest checkin (could be today or yesterday)
    const [latestCheckin] = await db
      .select()
      .from(lifeosDailyCheckins)
      .where(eq(lifeosDailyCheckins.userId, userId))
      .orderBy(desc(lifeosDailyCheckins.entryDate))
      .limit(1);

    let todayMorning: CoachContext["todayMorning"] = null;
    let todayEvening: CoachContext["todayEvening"] = null;
    let identityStatement: string | null = null;

    if (latestCheckin?.entryDate === today) {
      if (latestCheckin.morning) {
        const parsed = morningManifestoSchema.safeParse(latestCheckin.morning);
        if (parsed.success) {
          todayMorning = parsed.data;
          identityStatement = parsed.data.manifesto;
        }
      }
      if (latestCheckin.evening) {
        const parsed = eveningShutdownSchema.safeParse(latestCheckin.evening);
        if (parsed.success) {
          todayEvening = parsed.data;
        }
      }
    } else if (latestCheckin?.morning) {
      // Identity statement persists from the most recent morning even if
      // today's manifesto isn't done yet
      const parsed = morningManifestoSchema.safeParse(latestCheckin.morning);
      if (parsed.success) identityStatement = parsed.data.manifesto;
    }

    const activeQuests = await db
      .select({
        title: lifeosQuests.title,
        domain: lifeosQuests.domain,
        type: lifeosQuests.type,
        progress: lifeosQuests.progress,
      })
      .from(lifeosQuests)
      .where(
        and(
          eq(lifeosQuests.userId, userId),
          eq(lifeosQuests.archived, false),
          ne(lifeosQuests.status, "abandoned"),
        ),
      )
      .orderBy(lifeosQuests.createdAt);

    const recentConfidence = await db
      .select({
        title: lifeosConfidenceEntries.title,
        body: lifeosConfidenceEntries.body,
        createdAt: lifeosConfidenceEntries.createdAt,
      })
      .from(lifeosConfidenceEntries)
      .where(eq(lifeosConfidenceEntries.userId, userId))
      .orderBy(desc(lifeosConfidenceEntries.createdAt))
      .limit(5);

    const [scorecard, balance] = await Promise.all([
      getScorecard(userId),
      getLatestBalance(userId),
    ]);

    const qp = quarterProgress();

    return {
      identityStatement,
      todayMorning,
      todayEvening,
      activeQuests,
      scorecard,
      balance,
      recentConfidence: recentConfidence.map((c) => ({
        title: c.title,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
      })),
      quarterPhase: qp.phase,
      quarterDay: qp.day,
      quarterTotalDays: qp.totalDays,
    };
  },
);
