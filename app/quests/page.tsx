import { and, count, eq } from "@/lib/db/ops";
import { formatDay, formatInstant } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosQuests } from "@/lib/db/schema";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { fieldMarksShown } from "@/lib/collection/field-marks";
import { QuestsClient } from "@/components/quests/QuestsClient";
import { quarterProgress } from "@/lib/quests/quarter";
import { PageStamp } from "@/components/PageStamp";

export default async function QuestsPage() {
  const { user } = await requireUserContext();
  const progress = quarterProgress();

  const [quests, marks] = await Promise.all([
    db
      .select()
      .from(lifeosQuests)
      .where(
        and(
          eq(lifeosQuests.userId, user.id),
          eq(lifeosQuests.archived, false),
        ),
      )
      .orderBy(lifeosQuests.createdAt),
    fieldMarksShown(),
  ]);

  // Summits are counted across every quarter, archived or not: a quest
  // finished and then tidied away was still finished.
  let summits = 0;
  if (marks) {
    const [row] = await db
      .select({ value: count() })
      .from(lifeosQuests)
      .where(
        and(
          eq(lifeosQuests.userId, user.id),
          eq(lifeosQuests.status, "completed"),
        ),
      );
    summits = Number(row?.value ?? 0);
  }

  const serialised = quests.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    domain: q.domain as "work" | "life",
    type: q.type as "main" | "side",
    quarter: q.quarter,
    progress: q.progress,
    status: q.status as "active" | "paused" | "completed" | "abandoned",
    // the date the summit was reached, as the cairn's label
    reachedOn:
      marks && q.status === "completed"
        ? q.endDate
          ? formatDay(q.endDate, "d MMM yyyy")
          : formatInstant(q.updatedAt, "d MMM yyyy")
        : null,
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
        {/* The phase word ("Grind", "Sprint") went: it was never explained
            to the reader and the day count says where the quarter is. */}
        <span className="text-[11.5px] text-ink-400 tabular-nums">
          Day {progress.day} of {progress.totalDays}
          {marks && summits > 0 && (
            <>
              , {summits} {summits === 1 ? "summit" : "summits"} so far
            </>
          )}
        </span>
      </div>

      <QuestsClient quests={serialised} currentQuarter={progress.quarter} />
    </div>
  );
}
