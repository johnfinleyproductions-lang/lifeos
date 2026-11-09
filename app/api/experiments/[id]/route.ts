import { NextResponse } from "next/server";
import { and, eq } from "@/lib/db/ops";
import { db } from "@/lib/db";
import { lifeosExperiments, lifeosHabits } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { closeExperimentSchema } from "@/lib/experiments/schema";
import { timesPerWeek } from "@/lib/experiments/rules";
import { now as clock, todayKey } from "@/lib/time/day";

async function mine(id: string, userId: string) {
  if (!/^\d+$/.test(id)) return null;
  const [row] = await db
    .select()
    .from(lifeosExperiments)
    .where(and(eq(lifeosExperiments.id, id), eq(lifeosExperiments.userId, userId)))
    .limit(1);
  return row ?? null;
}

/**
 * PATCH /api/experiments/[id]: close it, with the review and the choice.
 *
 *   again    keep going: this one closes and the same sentence starts a
 *            new round today
 *   habit    keep it for good: this one closes and a habit is made from it
 *   paused   stop here
 *   changed  stop here; the changed version is started as its own
 *            experiment, pointing back at this one
 *
 * It can be closed before its last day. That is recorded as it is.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = closeExperimentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose what happens next." }, { status: 422 });
  }

  const { id } = await params;
  const exp = await mine(id, user.id);
  if (!exp) return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  if (exp.status === "closed") {
    return NextResponse.json({ error: "This one is already closed." }, { status: 409 });
  }

  const now = clock();
  let habitId: string | null = null;
  let nextId: string | null = null;

  if (parsed.data.outcome === "habit") {
    const name = exp.action.trim().replace(/[.!\s]+$/, "");
    const [habit] = await db
      .insert(lifeosHabits)
      .values({
        userId: user.id,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        cadence:
          timesPerWeek(exp.cadence) !== null
            ? "weekly"
            : exp.cadence === "weekdays"
              ? "weekdays"
              : "daily",
        description: "Began as an experiment.",
      })
      .returning();
    habitId = habit.id;
  }

  await db
    .update(lifeosExperiments)
    .set({
      status: "closed",
      outcome: parsed.data.outcome,
      worked: parsed.data.worked || null,
      didNot: parsed.data.didNot || null,
      nextStep: parsed.data.nextStep || null,
      closedAt: now,
      habitId,
      updatedAt: now,
    })
    .where(eq(lifeosExperiments.id, exp.id));

  if (parsed.data.outcome === "again") {
    const [next] = await db
      .insert(lifeosExperiments)
      .values({
        userId: user.id,
        action: exp.action,
        curiosity: exp.curiosity,
        cadence: exp.cadence,
        startDate: todayKey(),
        lengthDays: exp.lengthDays,
        status: "running",
        previousId: exp.id,
      })
      .returning();
    nextId = next.id;
  }

  return NextResponse.json({ ok: true, habitId, nextId });
}

/** DELETE /api/experiments/[id]: remove it and its days. For one started by mistake. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { id } = await params;
  const exp = await mine(id, user.id);
  if (!exp) return NextResponse.json({ error: "Experiment not found" }, { status: 404 });

  await db.delete(lifeosExperiments).where(eq(lifeosExperiments.id, exp.id));
  return NextResponse.json({ ok: true });
}
