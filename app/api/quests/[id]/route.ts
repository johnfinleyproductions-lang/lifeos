import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosQuests } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { updateQuestSchema } from "@/lib/quests/schema";

/**
 * PATCH /api/quests/[id] — partial update.
 *
 * Use cases: update progress slider, change status, archive (set archived=true).
 * No DELETE endpoint — archive is the soft-delete affordance.
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

  const parsed = updateQuestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const [updated] = await db
    .update(lifeosQuests)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(
      and(eq(lifeosQuests.id, id), eq(lifeosQuests.userId, user.id)),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, quest: updated });
}
