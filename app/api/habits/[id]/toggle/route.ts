import { NextResponse } from "next/server";
import { and, eq } from "@/lib/db/ops";
import { dayKeyOf, todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import {
  lifeosHabits,
  lifeosHabitCompletions,
} from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { keepable, writtenAtFrom, wrongAuthor } from "@/lib/offline/replay";

/**
 * POST /api/habits/[id]/toggle — toggle today's completion for a habit.
 *
 * If a row exists for (habit, today), delete it. Otherwise insert.
 * Returns the new completed state so the client can update its local UI.
 *
 * The body is optional. `{ completed: true | false }` asks for that state
 * outright instead of flipping whatever is there, which is what makes the
 * request safe to send twice. `writtenAt` comes with a tick that was kept
 * offline (lib/offline): the tick is filed under the day it was made, and
 * an untick steps aside if the habit was ticked again after it was written.
 */
export const POST = keepable(save);

async function save(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;
  const notTheirs = wrongAuthor(request, session);
  if (notTheirs) return notTheirs;

  const { id: habitId } = await params;

  let wanted: boolean | null = null;
  let at: Date | null = null;
  try {
    const body = (await request.json()) as { completed?: unknown; writtenAt?: unknown } | null;
    if (typeof body?.completed === "boolean") wanted = body.completed;
    at = writtenAtFrom(body?.writtenAt);
  } catch {
    // No body: the plain toggle.
  }
  const today = at ? dayKeyOf(at) : todayKey();

  // Verify the habit belongs to this user. Otherwise we'd let anyone toggle
  // any habit they know the UUID for.
  const habit = await db
    .select({ id: lifeosHabits.id })
    .from(lifeosHabits)
    .where(
      and(eq(lifeosHabits.id, habitId), eq(lifeosHabits.userId, user.id)),
    )
    .limit(1);
  if (habit.length === 0) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const existing = await db
    .select({
      id: lifeosHabitCompletions.id,
      createdAt: lifeosHabitCompletions.createdAt,
    })
    .from(lifeosHabitCompletions)
    .where(
      and(
        eq(lifeosHabitCompletions.habitId, habitId),
        eq(lifeosHabitCompletions.completionDate, today),
      ),
    )
    .limit(1);

  const done = existing.length > 0;
  const target = wanted ?? !done;
  if (target === done) return NextResponse.json({ ok: true, completed: done });

  if (done) {
    // The later edit wins: an untick written before the current tick was
    // made is out of date.
    if (at && existing[0].createdAt.getTime() > at.getTime()) {
      return NextResponse.json({ ok: true, completed: true, skipped: "newer" });
    }
    await db
      .delete(lifeosHabitCompletions)
      .where(eq(lifeosHabitCompletions.id, existing[0].id));
    return NextResponse.json({ ok: true, completed: false });
  }

  await db.insert(lifeosHabitCompletions).values({
    habitId,
    userId: user.id,
    completionDate: today,
    ...(at ? { createdAt: at } : {}),
  });
  return NextResponse.json({ ok: true, completed: true });
}
