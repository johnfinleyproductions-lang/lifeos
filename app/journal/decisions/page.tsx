import Link from "next/link";
import { format } from "date-fns";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosJournalEntries } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { getLens } from "@/lib/journal/lenses";
import { DECISION_CATEGORY_LABELS } from "@/lib/journal/schema";

export default async function JournalDecisionsPage() {
  const { user } = await requireUserContext();

  const decisions = await db
    .select()
    .from(lifeosJournalEntries)
    .where(
      and(
        eq(lifeosJournalEntries.userId, user.id),
        eq(lifeosJournalEntries.isDecision, true),
      ),
    )
    .orderBy(desc(lifeosJournalEntries.createdAt));

  // Stats
  const total = decisions.length;
  const twoWayCount = decisions.filter(
    (d) => d.decisionDoor === "two_way",
  ).length;
  const twoWayPct =
    total > 0 ? Math.round((twoWayCount / total) * 100) : 0;
  const lensCounts = new Map<string, number>();
  for (const d of decisions) {
    if (d.frameworkLens) {
      lensCounts.set(
        d.frameworkLens,
        (lensCounts.get(d.frameworkLens) ?? 0) + 1,
      );
    }
  }
  const topLens = [...lensCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  const topLensTitle = topLens ? getLens(topLens[0])?.title : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/journal"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          ← Today&apos;s page
        </Link>
        <Link
          href="/journal/past"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          Past entries →
        </Link>
      </div>

      <h1 className="font-serif text-3xl text-ink-50 mb-1">
        Decisions log
      </h1>
      <p className="text-sm text-ink-300 mb-8">
        Every entry tagged as a decision. Read backward — pattern-spotting.
      </p>

      {total === 0 ? (
        <div className="card text-center py-12">
          <div className="font-serif text-xl text-ink-100 mb-2">
            No decisions logged yet.
          </div>
          <p className="text-sm text-ink-300 mb-4">
            Tap the Decision tag on any journal entry to add it here.
          </p>
          <Link
            href="/journal"
            className="inline-block px-4 py-2 rounded-lg bg-accent-gold/15 text-accent-gold border border-accent-gold/30 text-sm hover:bg-accent-gold/25 transition"
          >
            Open today&apos;s page →
          </Link>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <Stat label="Decisions" value={String(total)} />
            <Stat label="Two-way doors" value={`${twoWayPct}%`} />
            <Stat
              label="Top lens"
              value={topLensTitle ?? "—"}
              small
            />
          </div>

          {/* List */}
          <div className="space-y-2">
            {decisions.map((d) => {
              const lens = d.frameworkLens
                ? getLens(d.frameworkLens)
                : null;
              const categoryLabel = d.decisionCategory
                ? DECISION_CATEGORY_LABELS[
                    d.decisionCategory as keyof typeof DECISION_CATEGORY_LABELS
                  ]
                : null;
              return (
                <div key={d.id} className="card">
                  <div className="card-glow" />
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {categoryLabel && (
                        <span className="text-[10px] uppercase tracking-wider text-accent-gold bg-accent-gold/10 px-2 py-0.5 rounded">
                          {categoryLabel}
                        </span>
                      )}
                      {d.decisionDoor && (
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                            d.decisionDoor === "two_way"
                              ? "text-accent-green bg-accent-green/10"
                              : "text-accent-rose bg-accent-rose/10"
                          }`}
                        >
                          {d.decisionDoor.replace("_", "-")} door
                        </span>
                      )}
                      {lens && (
                        <span className="text-[10px] text-ink-400">
                          via {lens.title}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-ink-400 shrink-0">
                      {format(new Date(d.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  {d.decisionSummary && (
                    <div className="font-serif text-lg text-ink-100 leading-snug">
                      {d.decisionSummary}
                    </div>
                  )}
                  <div className="text-sm text-ink-300 leading-relaxed mt-2 whitespace-pre-wrap">
                    {d.body.length > 400
                      ? d.body.slice(0, 400) + "…"
                      : d.body}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="card">
      <div className="card-glow" />
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-1">
        {label}
      </div>
      <div
        className={`font-serif text-ink-50 ${small ? "text-base" : "text-2xl"}`}
      >
        {value}
      </div>
    </div>
  );
}
