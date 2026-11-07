import { NextResponse } from "next/server";
import { todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosProtocolRuns } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { weeklyReviewInputSchema } from "@/lib/reflection/weekly-review-schema";

/**
 * POST /api/reflection/weekly-review — record a completed weekly review.
 *
 * Stored in `lifeos_protocol_runs` with slug='weekly_review'. The payload
 * holds the structured review data (reflect, wins, balance readings, etc.).
 * Only the balance dimensions the reviewer actually set are stored; an
 * untouched slider is not a reading. BalanceCard reads the most recent
 * run via `getLatestBalance`.
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

  const parsed = weeklyReviewInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const today = todayKey();

  const [run] = await db
    .insert(lifeosProtocolRuns)
    .values({
      userId: user.id,
      slug: "weekly_review",
      runDate: today,
      payload: parsed.data,
    })
    .returning();

  return NextResponse.json({ ok: true, run });
}
