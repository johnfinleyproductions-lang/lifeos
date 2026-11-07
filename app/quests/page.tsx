import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosQuests } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { QuestsClient } from "@/components/quests/QuestsClient";
import { quarterProgress } from "@/lib/quests/quarter";
import { PageStamp } from "@/components/PageStamp";

export default async function QuestsPage() {
  const { user } = await requireUserContext();
  const progress = quarterProgress();

  const quests = await db
    .select()
    .from(lifeosQuests)
    .where(
      and(
        eq(lifeosQuests.userId, user.id),
        eq(lifeosQuests.archived, false),
      ),
    )
    .orderBy(lifeosQuests.createdAt);

  const serialised = quests.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    domain: q.domain as "work" | "life",
    type: q.type as "main" | "side",
    quarter: q.quarter,
    progress: q.progress,
    status: q.status as "active" | "paused" | "completed" | "abandoned",
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <PageStamp
        title="Quarterly quests"
        subtitle="The few big things that matter most for the next ninety days."
      />

      <div className="tab-row mb-6">
        <span className="tab">{progress.quarter}</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400 tabular-nums">
          Day {progress.day} of {progress.totalDays}, {progress.phase}
        </span>
      </div>

      <QuestsClient quests={serialised} currentQuarter={progress.quarter} />
    </div>
  );
}
