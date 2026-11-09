import { NextResponse } from "next/server";
import { and, eq } from "@/lib/db/ops";
import { db } from "@/lib/db";
import { lifeosExperiments } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { startExperimentSchema } from "@/lib/experiments/schema";
import { MAX_RUNNING } from "@/lib/experiments/rules";
import { todayKey } from "@/lib/time/day";

/**
 * POST /api/experiments: start one. It begins today.
 *
 * At most two run at a time. An experiment that has passed its last day
 * and has not been closed still counts: closing it is part of running it.
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
  const parsed = startExperimentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Say what you will do, in a few words, and for how long." },
      { status: 422 },
    );
  }

  const open = await db
    .select({ id: lifeosExperiments.id })
    .from(lifeosExperiments)
    .where(and(eq(lifeosExperiments.userId, user.id), eq(lifeosExperiments.status, "running")));
  if (open.length >= MAX_RUNNING) {
    return NextResponse.json(
      { error: "Two are already running. Close one before starting another." },
      { status: 409 },
    );
  }

  let previousId: string | null = null;
  if (parsed.data.previousId) {
    const [previous] = await db
      .select({ id: lifeosExperiments.id })
      .from(lifeosExperiments)
      .where(
        and(
          eq(lifeosExperiments.id, parsed.data.previousId),
          eq(lifeosExperiments.userId, user.id),
        ),
      )
      .limit(1);
    previousId = previous?.id ?? null;
  }

  const [created] = await db
    .insert(lifeosExperiments)
    .values({
      userId: user.id,
      action: parsed.data.action,
      curiosity: parsed.data.curiosity || null,
      cadence: parsed.data.cadence,
      startDate: todayKey(),
      lengthDays: parsed.data.lengthDays,
      status: "running",
      previousId,
    })
    .returning();

  return NextResponse.json({ ok: true, experiment: { id: created.id } });
}
