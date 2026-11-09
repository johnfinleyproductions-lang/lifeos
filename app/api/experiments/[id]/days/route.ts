import { NextResponse } from "next/server";
import { and, eq } from "@/lib/db/ops";
import { db } from "@/lib/db";
import { lifeosExperimentDays, lifeosExperiments } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { markDaySchema } from "@/lib/experiments/schema";
import { canMark } from "@/lib/experiments/rules";
import { todayKey } from "@/lib/time/day";

/**
 * POST /api/experiments/[id]/days: mark a day, done or not, with a line on
 * how it went. Today by default; yesterday is allowed too, for the night
 * that got away. Marking the same day again replaces the mark.
 */
export async function POST(
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
  const parsed = markDaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "That mark could not be read." }, { status: 422 });
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }
  const [exp] = await db
    .select()
    .from(lifeosExperiments)
    .where(and(eq(lifeosExperiments.id, id), eq(lifeosExperiments.userId, user.id)))
    .limit(1);
  if (!exp) return NextResponse.json({ error: "Experiment not found" }, { status: 404 });

  const today = todayKey();
  const day = parsed.data.day ?? today;
  if (!canMark(exp, day, today)) {
    return NextResponse.json(
      { error: "Only today and yesterday can be marked, inside the experiment's dates." },
      { status: 422 },
    );
  }

  const values = {
    done: parsed.data.done,
    note: parsed.data.note || null,
    // A reason belongs to a day it did not happen.
    reason: parsed.data.done ? null : (parsed.data.reason ?? null),
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: lifeosExperimentDays.id })
    .from(lifeosExperimentDays)
    .where(
      and(
        eq(lifeosExperimentDays.experimentId, exp.id),
        eq(lifeosExperimentDays.entryDate, day),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(lifeosExperimentDays)
      .set(values)
      .where(eq(lifeosExperimentDays.id, existing.id));
  } else {
    await db.insert(lifeosExperimentDays).values({
      userId: user.id,
      experimentId: exp.id,
      entryDate: day,
      ...values,
    });
  }
  return NextResponse.json({ ok: true, day, done: parsed.data.done });
}
