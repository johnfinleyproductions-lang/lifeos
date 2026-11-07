import { Watermark } from "@/components/field/Watermark";
import Link from "next/link";
import { formatInstant } from "@/lib/time/day";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosJournalEntries } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { getLens } from "@/lib/journal/lenses";
import { DECISION_CATEGORY_LABELS } from "@/lib/journal/schema";
import { PageStamp } from "@/components/PageStamp";

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
  const twoWayPct = total > 0 ? Math.round((twoWayCount / total) * 100) : 0;
  const lensCounts = new Map<string, number>();
  for (const d of decisions) {
    if (d.frameworkLens) {
      lensCounts.set(
        d.frameworkLens,
        (lensCounts.get(d.frameworkLens) ?? 0) + 1,
      );
    }
  }
  const topLens = [...lensCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topLensTitle = topLens ? getLens(topLens[0])?.title : null;

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp
        title="Decisions log"
        subtitle="Every entry tagged as a decision. Read backward and the patterns show."
        backHref="/journal"
        backLabel="Today's page"
        right={
          <Link href="/journal/past" className="btn btn-sm btn-ghost">
            Past entries
          </Link>
        }
      />

      {total === 0 ? (
        <div className="sheet sheet-bare sheet-cut text-center py-10 relative">
          <Watermark name="nib" />
          <div className="t-h2 mb-2">No decisions logged yet.</div>
          <p className="text-[14.5px] text-ink-300 mb-5 max-w-[40ch] mx-auto">
            Tag any journal entry as a decision and it files here.
          </p>
          <Link href="/journal" className="btn">
            Open today&apos;s page
          </Link>
        </div>
      ) : (
        <>
          <div className="sheet grid grid-cols-3 gap-4 mb-8">
            <Stat label="Decisions" value={String(total)} foot="logged" />
            <Stat
              label="Two-way doors"
              value={`${twoWayPct}`}
              unit="%"
              foot={`${twoWayCount} reversible`}
            />
            <Stat
              label="Top lens"
              value={topLensTitle ?? "none"}
              small
              foot={
                topLens
                  ? `used ${topLens[1]} ${topLens[1] === 1 ? "time" : "times"}`
                  : "no lens yet"
              }
            />
          </div>

          <div className="space-y-3">
            {decisions.map((d) => {
              const lens = d.frameworkLens ? getLens(d.frameworkLens) : null;
              const categoryLabel = d.decisionCategory
                ? DECISION_CATEGORY_LABELS[
                    d.decisionCategory as keyof typeof DECISION_CATEGORY_LABELS
                  ]
                : null;
              const meta = [
                categoryLabel,
                d.decisionDoor
                  ? `${d.decisionDoor.replace("_", "-")} door`
                  : null,
                lens ? `via ${lens.title}` : null,
              ].filter(Boolean);
              return (
                <article key={d.id} className="sheet">
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <div className="lbl">{meta.join(", ")}</div>
                    <span className="text-[11.5px] text-ink-400 tabular-nums shrink-0">
                      {formatInstant(new Date(d.createdAt), "d MMM yyyy")}
                    </span>
                  </div>
                  {d.decisionSummary && (
                    <div className="font-serif text-[21px] leading-[1.3] tracking-[-0.01em]">
                      {d.decisionSummary}
                    </div>
                  )}
                  <div className="t-read text-ink-300 mt-2 whitespace-pre-wrap">
                    {d.body.length > 400
                      ? d.body.slice(0, 400) + "\u2026"
                      : d.body}
                  </div>
                </article>
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
  unit,
  foot,
  small = false,
}: {
  label: string;
  value: string;
  unit?: string;
  foot: string;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="stat-l">{label}</div>
      <div className={`stat-v ${small ? "text-[19px] truncate" : ""}`}>
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="stat-f">{foot}</div>
    </div>
  );
}
