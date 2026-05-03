import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosJournalEntries } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { updateJournalEntrySchema } from "@/lib/journal/schema";

/**
 * PATCH /api/journal/entries/[id] — partial update.
 *
 * Use cases: edit body after the fact, flip is_decision on/off, change
 * a decision's category or door tag.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateJournalEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const [updated] = await db
    .update(lifeosJournalEntries)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(lifeosJournalEntries.id, id),
        eq(lifeosJournalEntries.userId, user.id),
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, entry: updated });
}

/**
 * DELETE /api/journal/entries/[id] — hard delete.
 *
 * No archive/soft-delete here. Journal entries are private; the user
 * should be able to fully remove them. Open loops cascade-delete via FK.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { id } = await params;

  const result = await db
    .delete(lifeosJournalEntries)
    .where(
      and(
        eq(lifeosJournalEntries.id, id),
        eq(lifeosJournalEntries.userId, user.id),
      ),
    )
    .returning({ id: lifeosJournalEntries.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
