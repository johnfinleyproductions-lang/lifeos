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
      <PageStamp />

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="t-h1 text-ink-50 mb-1">
            Quarterly quests
          </h1>
          <p className="text-sm text-ink-300">
            The few big things that matter most for the next 90 days.
          </p>
        </div>
        <div className="text-right">
          <div className="font-serif text-xl text-ink-100">
            {progress.quarter}
          </div>
          <div className="text-xs text-ink-400 mt-0.5">
            Day {progress.day} / {progress.totalDays} · {progress.phase}
          </div>
        </div>
      </div>

      <QuestsClient quests={serialised} currentQuarter={progress.quarter} />
    </div>
  );
}
