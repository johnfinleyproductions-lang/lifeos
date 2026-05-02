import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosFocusSessions } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { requireActiveWorkspaceId } from "@/lib/workspace/active";
import { startFocusSchema } from "@/lib/focus/schema";

/**
 * POST /api/focus/start — open a focus session.
 *
 * Refuses if there's already an active session (ended_at IS NULL) for
 * this user. Stop the existing one first.
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

  const parsed = startFocusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const active = await db
    .select({ id: lifeosFocusSessions.id })
    .from(lifeosFocusSessions)
    .where(
      and(
        eq(lifeosFocusSessions.userId, user.id),
        isNull(lifeosFocusSessions.endedAt),
      ),
    )
    .limit(1);
  if (active.length > 0) {
    return NextResponse.json(
      { error: "An active focus session is already running" },
      { status: 409 },
    );
  }

  const workspaceId = await requireActiveWorkspaceId(user.id);
  const [created] = await db
    .insert(lifeosFocusSessions)
    .values({
      userId: user.id,
      workspaceId,
      label: parsed.data.label,
      startedAt: new Date(),
    })
    .returning();

  return NextResponse.json({ ok: true, session: created });
}
