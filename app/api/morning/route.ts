import { NextResponse } from "next/server";
import { and, eq } from "@/lib/db/ops";
import { todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { compactMorning, morningRequestSchema } from "@/lib/manifesto/schema";
import { storedFromDepthChoice } from "@/lib/settings/ritual-depth";

/**
 * POST /api/morning — upsert today's morning manifesto.
 *
 * Insert-or-update by (user_id, entry_date). The unique constraint on the
 * table makes ON CONFLICT the natural behavior — last write wins, so the
 * user can re-do the wizard if they change their mind in the morning.
 *
 * The body carries `depth` ("quick" | "full") beside the manifesto fields.
 * It lands in `ritual_depth` on the row, which is how the wizard remembers
 * the last pick; the jsonb holds only what was actually asked.
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

  const parsed = morningRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const { depth, ...manifesto } = parsed.data;
  const morning = compactMorning(manifesto);
  const ritualDepth = storedFromDepthChoice(depth);
  const today = todayKey();

  const existing = await db
    .select({ id: lifeosDailyCheckins.id })
    .from(lifeosDailyCheckins)
    .where(
      and(
        eq(lifeosDailyCheckins.userId, user.id),
        eq(lifeosDailyCheckins.entryDate, today),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(lifeosDailyCheckins)
      .set({
        morning,
        ritualDepth,
        updatedAt: new Date(),
      })
      .where(eq(lifeosDailyCheckins.id, existing[0].id));
    return NextResponse.json({ ok: true, updated: true });
  }

  await db.insert(lifeosDailyCheckins).values({
    userId: user.id,
    entryDate: today,
    morning,
    ritualDepth,
  });

  return NextResponse.json({ ok: true, created: true });
}
