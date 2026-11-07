import Link from "next/link";
import { and, eq, ne, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosQuests } from "@/lib/db/schema/lifeos";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { quarterProgress } from "@/lib/quests/quarter";

/**
 * One riso ink per domain, so a quest's colour means the same thing
 * everywhere. The tokens are channel triplets, so they have to be wrapped
 * in rgb() here; a bare var(--violet) is "110 85 168", which is not a
 * colour, and the bar silently renders empty.
 */
const DOMAIN_INK = {
  work: "rgb(var(--violet))",
  life: "rgb(var(--rose))",
} as const;

export async function QuestsCard() {
  const { user } = await getAuthContext();
  const progress = quarterProgress();
  const left = progress.totalDays - progress.day;

  if (!user) {
    return (
      <div className="sheet">
        <div className="tab-row">
          <span className="tab">Quests</span>
          <span className="fill" />
          <span className="text-[11.5px] text-ink-400">{progress.quarter}</span>
        </div>
        <p className="t-read text-ink-300 m-0">
          Pick a profile to set your quests for the quarter.
        </p>
      </div>
    );
  }

  // Active main quests plus a count of the side ones, capped at two rows
  // so the card stays compact on Today.
  const allActive = await db
    .select()
    .from(lifeosQuests)
    .where(
      and(
        eq(lifeosQuests.userId, user.id),
        eq(lifeosQuests.archived, false),
        ne(lifeosQuests.status, "abandoned"),
      ),
    )
    .orderBy(asc(lifeosQuests.createdAt));

  const main = allActive.filter((q) => q.type === "main").slice(0, 2);
  const sideCount = allActive.filter((q) => q.type === "side").length;

  return (
    <div className="sheet">
      <div className="tab-row">
        <span className="tab">Quests</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400 tabular-nums">
          {progress.quarter}
        </span>
      </div>

      {allActive.length === 0 ? (
        <p className="t-read text-ink-300 m-0">
          Nothing set for this quarter yet. One or two is the right number.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* The countdown only prints once there is something it is
              counting toward. On an empty card it was a clock with no
              appointment. */}
          <p className="stat-f mt-0 mb-0.5">
            Day {progress.day} of {progress.totalDays}, {left}{" "}
            {left === 1 ? "day" : "days"} left
          </p>
          {main.map((q) => (
            <div key={q.id}>
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <span className="text-[13.5px] leading-[1.3]">{q.title}</span>
                <span className="text-[11.5px] text-ink-400 tabular-nums shrink-0">
                  {q.progress}%
                </span>
              </div>
              <div className="plot">
                <span
                  style={{
                    width: `${q.progress}%`,
                    background:
                      DOMAIN_INK[q.domain as "work" | "life"] ??
                      "rgb(var(--spot))",
                  }}
                />
              </div>
            </div>
          ))}
          {sideCount > 0 && (
            <p className="text-[11.5px] text-ink-400 m-0">
              and {sideCount} on the side
            </p>
          )}
        </div>
      )}

      <Link href="/quests" className="btn btn-sm btn-ghost w-full mt-3.5">
        Open quests
      </Link>
    </div>
  );
}
