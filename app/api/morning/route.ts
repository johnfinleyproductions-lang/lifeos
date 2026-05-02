import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { requireActiveWorkspaceId } from "@/lib/workspace/active";
import { morningManifestoSchema } from "@/lib/manifesto/schema";

/**
 * POST /api/morning — upsert today's morning manifesto.
 *
 * Insert-or-update by (user_id, entry_date). The unique constraint on the
 * table makes ON CONFLICT the natural behavior — last write wins, so the
 * user can re-do the wizard if they change their mind in the morning.
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

  const parsed = morningManifestoSchema.safeParse(body);
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
        morning: parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(lifeosDailyCheckins.id, existing[0].id));
    return NextResponse.json({ ok: true, updated: true });
  }

  await db.insert(lifeosDailyCheckins).values({
    userId: user.id,
    workspaceId,
    entryDate: today,
    morning: parsed.data,
  });

  return NextResponse.json({ ok: true, created: true });
}
