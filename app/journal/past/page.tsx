import { Watermark } from "@/components/field/Watermark";
import Link from "next/link";
import { formatDay, formatInstant } from "@/lib/time/day";
import { desc, eq } from "@/lib/db/ops";
import { db } from "@/lib/db";
import { lifeosJournalEntries } from "@/lib/db/schema";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { getLens } from "@/lib/journal/lenses";
import { PageStamp } from "@/components/PageStamp";
import {
  excerptAround,
  highlightParts,
  matchesQuery,
  queryWords,
} from "@/lib/journal/search";

const MODE_LABEL: Record<string, string> = {
  stream: "Stream",
  framework: "Framework",
  conversation: "Conversation",
};

export default async function JournalPastPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user } = await requireUserContext();
  const query = ((await searchParams).q ?? "").trim().slice(0, 120);
  const words = queryWords(query);
  const searching = words.length > 0;

  const all = await db
    .select()
    .from(lifeosJournalEntries)
    .where(eq(lifeosJournalEntries.userId, user.id))
    // By the day the entry belongs to, then by when it was written. Ordering
    // on created_at alone misfiled anything backdated or written after
    // midnight. idx_lifeos_journal_user_date covers (user_id, entry_date).
    .orderBy(
      desc(lifeosJournalEntries.entryDate),
      desc(lifeosJournalEntries.createdAt),
    )
    // Browsing shows the latest 200. A search looks through all of them.
    .limit(searching ? 5000 : 200);

  const entries = searching ? all.filter((e) => matchesQuery(e, words)) : all;

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
        subtitle={
          searching
            ? `${entries.length} of ${all.length} ${all.length === 1 ? "entry" : "entries"} mention \u201c${query}\u201d.`
            : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}.`
        }
        backHref="/journal"
        backLabel="Today's page"
        right={
          <Link href="/journal/decisions" className="btn btn-sm btn-ghost min-h-9">
            Decisions log
          </Link>
        }
      />

      {all.length > 0 && (
        <form action="/journal/past" method="get" role="search" className="flex flex-wrap items-center gap-3 mb-8">
          <label htmlFor="journal-search" className="sr-only">
            Search your journal
          </label>
          <input
            id="journal-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search your journal"
            autoComplete="off"
            className="flex-1 min-w-[200px] min-h-11 px-3.5 bg-ink-700 border-[1.5px] border-ink-100 font-serif text-[17px] text-ink-100 placeholder:text-ink-400 outline-none focus-visible:shadow-mis-sm"
          />
          <button type="submit" className="btn min-h-11">
            Search
          </button>
          {searching && (
            <Link href="/journal/past" className="btn btn-ghost min-h-11">
              Clear
            </Link>
          )}
        </form>
      )}

      {searching && entries.length === 0 ? (
        <div className="sheet sheet-bare text-center py-10">
          <div className="t-h2 mb-2">Nothing mentions that.</div>
          <p className="text-[14.5px] text-ink-300 max-w-[44ch] mx-auto m-0">
            Every word has to appear in the entry. Try fewer words, or a shorter one.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="sheet sheet-bare sheet-cut text-center py-10 relative">
          <Watermark name="nib" />
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
                        {searching ? (
                          <Marked text={excerptAround(e.body, words)} words={words} />
                        ) : e.body.length > 600 ? (
                          e.body.slice(0, 600) + "\u2026"
                        ) : (
                          e.body
                        )}
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
                            <Marked text={e.decisionSummary} words={words} />
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

/** Text with the searched words marked, the way a highlighter would. */
function Marked({ text, words }: { text: string; words: string[] }) {
  if (words.length === 0) return <>{text}</>;
  return (
    <>
      {highlightParts(text, words).map((part, i) =>
        part.hit ? (
          <mark
            key={i}
            style={{ background: "rgb(var(--gold) / 0.42)", color: "inherit", padding: "0 1px" }}
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
