import Link from "next/link";
import { formatDay, formatInstant } from "@/lib/time/day";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosJournalEntries } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { getLens } from "@/lib/journal/lenses";
import { PageStamp } from "@/components/PageStamp";

const MODE_LABEL: Record<string, string> = {
  stream: "Stream",
  framework: "Framework",
  conversation: "Conversation",
};

export default async function JournalPastPage() {
  const { user } = await requireUserContext();

  const entries = await db
    .select()
    .from(lifeosJournalEntries)
    .where(eq(lifeosJournalEntries.userId, user.id))
    .orderBy(desc(lifeosJournalEntries.createdAt))
    .limit(200);

  // Group by entry_date for visual rhythm
  const grouped = new Map<string, typeof entries>();
  for (const e of entries) {
    const list = grouped.get(e.entryDate) ?? [];
    list.push(e);
    grouped.set(e.entryDate, list);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp
        title="Past entries"
        subtitle={`${entries.length} ${entries.length === 1 ? "entry" : "entries"}.`}
        backHref="/journal"
        backLabel="Today's page"
        right={
          <Link href="/journal/decisions" className="btn btn-sm btn-ghost">
            Decisions log
          </Link>
        }
      />

      {entries.length === 0 ? (
        <div className="sheet sheet-bare border-dashed text-center py-10">
          <div className="t-h2 mb-2">Nothing yet.</div>
          <p className="text-[14.5px] text-ink-300 mb-5 max-w-[40ch] mx-auto">
            Write your first entry: a stream, a framework, or a conversation.
          </p>
          <Link href="/journal" className="btn">
            Open today&apos;s page
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([date, dayEntries]) => (
            <section key={date}>
              <div className="tab-row">
                <span className="tab">
                  {formatDay(date, "EEEE, d MMMM yyyy")}
                </span>
                <span className="fill" />
                <span className="text-[11.5px] text-ink-400 tabular-nums">
                  {dayEntries.length}{" "}
                  {dayEntries.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <div className="space-y-3">
                {dayEntries.map((e) => {
                  const lens = e.frameworkLens
                    ? getLens(e.frameworkLens)
                    : null;
                  const meta = [
                    MODE_LABEL[e.mode] ?? e.mode,
                    lens?.title,
                    e.isDecision ? "decision" : null,
                  ].filter(Boolean);
                  return (
                    <article key={e.id} className="sheet">
                      <div className="flex items-baseline justify-between gap-3 mb-3">
                        <div className="lbl">{meta.join(", ")}</div>
                        <span className="text-[11.5px] text-ink-400 tabular-nums shrink-0">
                          {formatInstant(new Date(e.createdAt), "h:mm a")}
                        </span>
                      </div>
                      {lens && <div className="t-h2 mb-2">{lens.prompt}</div>}
                      <div className="t-read whitespace-pre-wrap">
                        {e.body.length > 600
                          ? e.body.slice(0, 600) + "\u2026"
                          : e.body}
                      </div>
                      {e.isDecision && e.decisionSummary && (
                        <div className="mt-4 pt-3 border-t-[1.5px] border-ink-500 flex gap-3.5">
                          <span
                            className="shrink-0 w-[84px] text-[11.5px] text-ink-400 pt-[3px]"
                            style={{
                              fontVariationSettings: "'wdth' 100, 'wght' 680",
                            }}
                          >
                            Decided
                          </span>
                          <span className="flex-1 font-serif text-base leading-[1.5]">
                            {e.decisionSummary}
                            {e.decisionDoor && (
                              <span className="text-ink-400 text-[13px] font-sans ml-2">
                                {e.decisionDoor.replace("_", "-")} door
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
