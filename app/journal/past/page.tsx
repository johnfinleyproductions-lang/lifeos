import Link from "next/link";
import { format } from "date-fns";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosJournalEntries } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { getLens } from "@/lib/journal/lenses";

const MODE_ACCENT: Record<string, string> = {
  stream: "text-accent-violet",
  framework: "text-accent-sky",
  conversation: "text-accent-gold",
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
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/journal"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          ← Today&apos;s page
        </Link>
        <Link
          href="/journal/decisions"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          Decisions log →
        </Link>
      </div>

      <h1 className="font-serif text-3xl text-ink-50 mb-1">Past entries</h1>
      <p className="text-sm text-ink-300 mb-8">
        {entries.length} {entries.length === 1 ? "entry" : "entries"}.
      </p>

      {entries.length === 0 ? (
        <div className="card text-center py-12">
          <div className="font-serif text-xl text-ink-100 mb-2">
            Nothing yet.
          </div>
          <p className="text-sm text-ink-300 mb-4">
            Write your first entry — Stream, Framework, or Conversation.
          </p>
          <Link
            href="/journal"
            className="inline-block px-4 py-2 rounded-lg bg-accent-violet/15 text-accent-violet border border-accent-violet/30 text-sm hover:bg-accent-violet/25 transition"
          >
            Open today&apos;s page →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([date, dayEntries]) => (
            <section key={date}>
              <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
                {format(new Date(date), "EEEE · MMMM d, yyyy")}
              </div>
              <div className="space-y-2">
                {dayEntries.map((e) => {
                  const lens = e.frameworkLens
                    ? getLens(e.frameworkLens)
                    : null;
                  return (
                    <div key={e.id} className="card">
                      <div className="card-glow" />
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase tracking-wider ${
                              MODE_ACCENT[e.mode] ?? "text-ink-400"
                            }`}
                          >
                            {e.mode}
                          </span>
                          {lens && (
                            <span className="text-[10px] text-ink-400">
                              · {lens.title}
                            </span>
                          )}
                          {e.isDecision && (
                            <span className="text-[10px] text-accent-gold uppercase tracking-wider">
                              · decision
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-ink-400 shrink-0">
                          {format(new Date(e.createdAt), "h:mm a")}
                        </span>
                      </div>
                      {lens && (
                        <div className="font-serif text-base text-ink-100 mb-2 italic">
                          {lens.prompt}
                        </div>
                      )}
                      <div
                        className={`text-sm text-ink-200 leading-relaxed whitespace-pre-wrap ${
                          e.mode === "stream" || e.mode === "conversation"
                            ? "font-serif text-base"
                            : ""
                        }`}
                      >
                        {e.body.length > 600
                          ? e.body.slice(0, 600) + "…"
                          : e.body}
                      </div>
                      {e.isDecision && e.decisionSummary && (
                        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-ink-300">
                          <span className="text-accent-gold uppercase tracking-wider">
                            Decision:
                          </span>{" "}
                          {e.decisionSummary}
                          {e.decisionDoor && (
                            <span className="text-ink-400 ml-2">
                              · {e.decisionDoor.replace("_", "-")} door
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
