import { syncEveningWins } from "@/lib/confidence/sync-evening-wins";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import {
  compactEvening,
  eveningRequestSchema,
} from "@/lib/manifesto/evening-schema";
import { storedFromDepthChoice } from "@/lib/settings/ritual-depth";

/**
 * POST /api/evening — upsert today's evening shutdown.
 *
 * Same pattern as POST /api/morning: insert-or-update by (user_id, entry_date).
 * Writes to the `evening` jsonb column. If a morning row exists for today,
 * we update that row; otherwise we insert a new row with morning=null and
 * just the evening data.
 *
 * The body carries `depth` ("quick" | "full") beside the shutdown fields.
 * It lands in `ritual_depth` on the row so the wizard remembers the last
 * pick; the jsonb holds only what was actually written.
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

  const parsed = eveningRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const { depth, ...shutdown } = parsed.data;
  const evening = compactEvening(shutdown);
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
        evening,
        ritualDepth,
        updatedAt: new Date(),
      })
      .where(eq(lifeosDailyCheckins.id, existing[0].id));
    await syncEveningWins(user.id);
    return NextResponse.json({ ok: true, updated: true });
  }

  await db.insert(lifeosDailyCheckins).values({
    userId: user.id,
    entryDate: today,
    evening,
    ritualDepth,
  });

  await syncEveningWins(user.id);
  return NextResponse.json({ ok: true, created: true });
}
