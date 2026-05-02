import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosFocusSessions } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { stopFocusSchema } from "@/lib/focus/schema";

/**
 * POST /api/focus/stop — close the active focus session.
 *
 * Computes duration_minutes server-side so users can't fudge it from the
 * client. Optional note is appended.
 */
export async function POST(request: Request) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const parsed = stopFocusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const [active] = await db
    .select()
    .from(lifeosFocusSessions)
    .where(
      and(
        eq(lifeosFocusSessions.userId, user.id),
        isNull(lifeosFocusSessions.endedAt),
      ),
    )
    .limit(1);

  if (!active) {
    return NextResponse.json(
      { error: "No active focus session" },
      { status: 404 },
    );
  }

  const endedAt = new Date();
  const durationMinutes = Math.max(
    0,
    Math.round((endedAt.getTime() - active.startedAt.getTime()) / 60000),
  );

  const [updated] = await db
    .update(lifeosFocusSessions)
    .set({
      endedAt,
      durationMinutes,
      note: parsed.data.note,
    })
    .where(eq(lifeosFocusSessions.id, active.id))
    .returning();

  return NextResponse.json({ ok: true, session: updated });
}
