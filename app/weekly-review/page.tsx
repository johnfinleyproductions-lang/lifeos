import Link from "next/link";
import { and, eq } from "@/lib/db/ops";
import { db } from "@/lib/db";
import { lifeosQuests } from "@/lib/db/schema";
import { requireUserContext } from "@/lib/auth/server-helpers";
import {
  getScorecard,
  getSuggestedWins,
} from "@/lib/reflection/auto-detect";
import { WeeklyReviewClient } from "@/components/reflection/WeeklyReviewClient";
import { PageStamp } from "@/components/PageStamp";

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
      <PageStamp
        title="Weekly review"
        subtitle="Twenty minutes. Six phases. What you plant here is waiting on Monday's morning sheet."
        backHref="/discipline"
        backLabel="Discipline"
        right={
          <Link
            href="/weekly-review/past"
            className="btn btn-sm btn-ghost min-h-9"
          >
            Past reviews
          </Link>
        }
      />

      <WeeklyReviewClient
        scorecard={scorecard}
        suggestedWins={suggestedWins}
        activeQuests={activeQuests}
      />
    </div>
  );
}
