import Link from "next/link";
import { and, eq, ne, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosQuests } from "@/lib/db/schema/lifeos";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { quarterProgress } from "@/lib/quests/quarter";

const DOMAIN_ACCENT = {
  work: "text-accent-violet",
  life: "text-accent-rose",
} as const;

export async function QuestsCard() {
  const { user } = await getAuthContext();
  const progress = quarterProgress();

  if (!user) {
    return (
      <div className="card">
        <div className="card-glow" />
        <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
          Quarterly quests
        </div>
        <div className="font-serif text-lg text-ink-100 mb-1">
          {progress.quarter} · Day {progress.day} / {progress.totalDays}
        </div>
        <p className="text-xs text-ink-400">
          Sign in to set your quests for the quarter.
        </p>
      </div>
    );
  }

  // Show active main quests + a count of side ones, capped to 2 main rows
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
    <Link
      href="/quests"
      className="card block hover:bg-white/[0.02] transition"
    >
      <div className="card-glow" />
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
        Quarterly quests
      </div>
      <div className="font-serif text-lg text-ink-100 mb-3">
        {progress.quarter} · Day {progress.day} / {progress.totalDays}
        <span className="text-xs text-ink-400 ml-2 font-sans">
          {progress.phase}
        </span>
      </div>

      {allActive.length === 0 ? (
        <p className="text-xs text-ink-400">
          No quests yet. Set 1-2 things you want to ship this quarter.
        </p>
      ) : (
        <div className="space-y-3">
          {main.map((q) => (
            <div key={q.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span
                  className={`font-medium tracking-wider ${
                    DOMAIN_ACCENT[q.domain as "work" | "life"]
                  } uppercase`}
                >
                  {q.domain}
                </span>
                <span className="text-ink-400 tabular-nums">
                  {q.progress}%
                </span>
              </div>
              <div className="text-sm text-ink-100 mb-1.5 truncate">
                {q.title}
              </div>
              <div className="h-1 bg-ink-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-green to-accent-sky rounded-full transition-all"
                  style={{ width: `${q.progress}%` }}
                />
              </div>
            </div>
          ))}
          {sideCount > 0 && (
            <div className="text-[11px] text-ink-400 pt-1">
              + {sideCount} side {sideCount === 1 ? "quest" : "quests"}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
