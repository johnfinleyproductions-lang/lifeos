import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import {
  lifeosHabits,
  lifeosHabitCompletions,
} from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";

/**
 * POST /api/habits/[id]/toggle — toggle today's completion for a habit.
 *
 * If a row exists for (habit, today), delete it. Otherwise insert.
 * Returns the new completed state so the client can update its local UI.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { id: habitId } = await params;
  const today = format(new Date(), "yyyy-MM-dd");

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
    .select({ id: lifeosHabitCompletions.id })
    .from(lifeosHabitCompletions)
    .where(
      and(
        eq(lifeosHabitCompletions.habitId, habitId),
        eq(lifeosHabitCompletions.completionDate, today),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(lifeosHabitCompletions)
      .where(eq(lifeosHabitCompletions.id, existing[0].id));
    return NextResponse.json({ ok: true, completed: false });
  }

  await db.insert(lifeosHabitCompletions).values({
    habitId,
    userId: user.id,
    completionDate: today,
  });
  return NextResponse.json({ ok: true, completed: true });
}
