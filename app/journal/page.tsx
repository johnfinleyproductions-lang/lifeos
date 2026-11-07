import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { formatInstant, todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosJournalEntries } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { lensForDay } from "@/lib/journal/daily-lens";
import {
  JournalEditor,
  type TodayEntry,
} from "@/components/journal/JournalEditor";
import { PageStamp } from "@/components/PageStamp";

export default async function JournalPage() {
  const { user } = await requireUserContext();
  const today = todayKey();
  const lens = lensForDay(today);

  // Today's entries, oldest first, printed under the page. Saving used to
  // clear the field after a flash of "Saved" and the words appeared nowhere
  // until Past entries; now they stay on the sheet you wrote them on.
  const rows = await db
    .select({
      id: lifeosJournalEntries.id,
      mode: lifeosJournalEntries.mode,
      body: lifeosJournalEntries.body,
      frameworkLens: lifeosJournalEntries.frameworkLens,
      isDecision: lifeosJournalEntries.isDecision,
      decisionSummary: lifeosJournalEntries.decisionSummary,
      decisionDoor: lifeosJournalEntries.decisionDoor,
      createdAt: lifeosJournalEntries.createdAt,
    })
    .from(lifeosJournalEntries)
    .where(
      and(
        eq(lifeosJournalEntries.userId, user.id),
        eq(lifeosJournalEntries.entryDate, today),
      ),
    )
    .orderBy(asc(lifeosJournalEntries.createdAt));

  const todayEntries: TodayEntry[] = rows.map((r) => ({
    id: r.id,
    mode: r.mode,
    body: r.body,
    frameworkLens: r.frameworkLens,
    isDecision: r.isDecision,
    decisionSummary: r.decisionSummary,
    decisionDoor: r.decisionDoor,
    time: formatInstant(new Date(r.createdAt), "h:mm a"),
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp
        title="Journal"
        subtitle="Private writing space. Stays here; nothing else in the app reads it."
        right={
          <>
            <Link
              href="/journal/past"
              className="btn btn-sm btn-ghost min-h-9"
            >
              Past entries
            </Link>
            <Link
              href="/journal/decisions"
              className="btn btn-sm btn-ghost min-h-9"
            >
              Decisions log
            </Link>
          </>
        }
      />

      <JournalEditor dailyLensKey={lens.key} todayEntries={todayEntries} />
    </div>
  );
}
