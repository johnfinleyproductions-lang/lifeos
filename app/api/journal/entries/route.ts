import { NextResponse } from "next/server";
import { and, eq } from "@/lib/db/ops";
import { dayKeyOf, todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosJournalEntries } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { createJournalEntrySchema } from "@/lib/journal/schema";
import { keepable, writtenAtFrom, wrongAuthor } from "@/lib/offline/replay";

/**
 * POST /api/journal/entries — create a new entry.
 *
 * Always inserts a new row (no upsert) — journals are append-only by
 * design. Multiple entries per day are fine; that's how journaling works.
 */
export const POST = keepable(save);

async function save(request: Request) {
  const { session, user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;
  const notTheirs = wrongAuthor(request, session);
  if (notTheirs) return notTheirs;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createJournalEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  // A write kept offline is filed under the day and time it was written.
  const at = writtenAtFrom(parsed.data.writtenAt);
  const today = at ? dayKeyOf(at) : todayKey();
  const entryDate = parsed.data.entryDate ?? today;

  if (at) {
    // A replay can arrive twice: once when the connection flickered back and
    // the answer was lost, once more on the next try. The same words on the
    // same day are the same entry.
    const sameDay = await db
      .select()
      .from(lifeosJournalEntries)
      .where(
        and(
          eq(lifeosJournalEntries.userId, user.id),
          eq(lifeosJournalEntries.entryDate, entryDate),
        ),
      );
    const already = sameDay.find((e) => e.body === parsed.data.body);
    if (already) return NextResponse.json({ ok: true, entry: already, duplicate: true });
  }

  const [created] = await db
    .insert(lifeosJournalEntries)
    .values({
      userId: user.id,
      entryDate,
      ...(at ? { createdAt: at, updatedAt: at } : {}),
      mode: parsed.data.mode,
      body: parsed.data.body,
      frameworkLens: parsed.data.frameworkLens,
      isDecision: parsed.data.isDecision ?? false,
      decisionSummary: parsed.data.decisionSummary,
      decisionCategory: parsed.data.decisionCategory,
      decisionDoor: parsed.data.decisionDoor,
    })
    .returning();

  return NextResponse.json({ ok: true, entry: created });
}
