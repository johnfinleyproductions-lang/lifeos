import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { requireActiveWorkspaceId } from "@/lib/workspace/active";
import { eveningShutdownSchema } from "@/lib/manifesto/evening-schema";

/**
 * POST /api/evening — upsert today's evening shutdown.
 *
 * Same pattern as POST /api/morning: insert-or-update by (user_id, entry_date).
 * Writes to the `evening` jsonb column. If a morning row exists for today,
 * we update that row; otherwise we insert a new row with morning=null and
 * just the evening data.
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

  const parsed = eveningShutdownSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const workspaceId = await requireActiveWorkspaceId(user.id);
  const today = format(new Date(), "yyyy-MM-dd");

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
        evening: parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(lifeosDailyCheckins.id, existing[0].id));
    return NextResponse.json({ ok: true, updated: true });
  }

  await db.insert(lifeosDailyCheckins).values({
    userId: user.id,
    workspaceId,
    entryDate: today,
    evening: parsed.data,
  });

  return NextResponse.json({ ok: true, created: true });
}
