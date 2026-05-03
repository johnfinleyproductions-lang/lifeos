import Link from "next/link";
import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosQuests } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import {
  getScorecard,
  getSuggestedWins,
} from "@/lib/reflection/auto-detect";
import { WeeklyReviewClient } from "@/components/reflection/WeeklyReviewClient";

export default async function WeeklyReviewPage() {
  const { user } = await requireUserContext();

  const [scorecard, suggestedWins, activeQuests] = await Promise.all([
    getScorecard(user.id),
    getSuggestedWins(user.id),
    db
      .select({
        id: lifeosQuests.id,
        title: lifeosQuests.title,
        domain: lifeosQuests.domain,
        type: lifeosQuests.type,
        progress: lifeosQuests.progress,
      })
      .from(lifeosQuests)
      .where(
        and(
          eq(lifeosQuests.userId, user.id),
          eq(lifeosQuests.archived, false),
          eq(lifeosQuests.status, "active"),
        ),
      ),
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/discipline"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          ← Discipline
        </Link>
        <div className="text-xs text-ink-400 uppercase tracking-[0.18em]">
          {format(new Date(), "EEEE · MMMM d")}
        </div>
      </div>

      <h1 className="font-serif text-3xl text-ink-50 mb-1">Weekly review</h1>
      <p className="text-sm text-ink-300 mb-8">
        20 minutes. Six phases. Sets the rhythm for next week.
      </p>

      <WeeklyReviewClient
        scorecard={scorecard}
        suggestedWins={suggestedWins}
        activeQuests={activeQuests}
      />
    </div>
  );
}
