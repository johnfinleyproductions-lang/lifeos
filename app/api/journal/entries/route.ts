import { NextResponse } from "next/server";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { lifeosJournalEntries } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { requireActiveWorkspaceId } from "@/lib/workspace/active";
import { createJournalEntrySchema } from "@/lib/journal/schema";

/**
 * POST /api/journal/entries — create a new entry.
 *
 * Always inserts a new row (no upsert) — journals are append-only by
 * design. Multiple entries per day are fine; that's how journaling works.
 */
export async function POST(request: Request) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

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

  const workspaceId = await requireActiveWorkspaceId(user.id);
  const today = format(new Date(), "yyyy-MM-dd");

  const [created] = await db
    .insert(lifeosJournalEntries)
    .values({
      userId: user.id,
      workspaceId,
      entryDate: parsed.data.entryDate ?? today,
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
