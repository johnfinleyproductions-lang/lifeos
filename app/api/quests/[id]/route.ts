import { NextResponse } from "next/server";
import { and, eq } from "@/lib/db/ops";
import { todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosQuests } from "@/lib/db/schema";
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

  const mine = and(eq(lifeosQuests.id, id), eq(lifeosQuests.userId, user.id));

  // A quest marked done takes today as its end date, unless one was
  // already set. That is the date its cairn carries.
  let closing: { endDate?: string } = {};
  if (parsed.data.status === "completed") {
    const [current] = await db
      .select({ endDate: lifeosQuests.endDate })
      .from(lifeosQuests)
      .where(mine)
      .limit(1);
    if (current && !current.endDate) closing = { endDate: todayKey() };
  }

  const [updated] = await db
    .update(lifeosQuests)
    .set({
      ...parsed.data,
      ...closing,
      updatedAt: new Date(),
    })
    .where(mine)
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, quest: updated });
}
