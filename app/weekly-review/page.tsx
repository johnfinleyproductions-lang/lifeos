import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosQuests } from "@/lib/db/schema/lifeos";
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
        subtitle="Twenty minutes. Six phases. Sets the rhythm for next week."
        backHref="/discipline"
        backLabel="Discipline"
      />

      <WeeklyReviewClient
        scorecard={scorecard}
        suggestedWins={suggestedWins}
        activeQuests={activeQuests}
      />
    </div>
  );
}
