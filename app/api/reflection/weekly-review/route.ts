import { NextResponse } from "next/server";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { lifeosProtocolRuns } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { requireActiveWorkspaceId } from "@/lib/workspace/active";
import { weeklyReviewPayloadSchema } from "@/lib/reflection/weekly-review-schema";

/**
 * POST /api/reflection/weekly-review — record a completed weekly review.
 *
 * Stored in `lifeos_protocol_runs` with slug='weekly_review'. The payload
 * holds the structured review data (reflect, wins, balance scores, etc.).
 * BalanceCard reads the most recent run via `getLatestBalance`.
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

  const parsed = weeklyReviewPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const workspaceId = await requireActiveWorkspaceId(user.id);
  const today = format(new Date(), "yyyy-MM-dd");

  const [run] = await db
    .insert(lifeosProtocolRuns)
    .values({
      userId: user.id,
      workspaceId,
      slug: "weekly_review",
      runDate: today,
      payload: parsed.data,
    })
    .returning();

  return NextResponse.json({ ok: true, run });
}
