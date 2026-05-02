import { NextResponse } from "next/server";
import { format } from "date-fns";
import { db } from "@/lib/db";
import {
  lifeosProtocolRuns,
  lifeosConfidenceEntries,
} from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { requireActiveWorkspaceId } from "@/lib/workspace/active";
import { protocolRunSchema } from "@/lib/protocols/schema";
import { getProtocol } from "@/lib/protocols/definitions";

/**
 * POST /api/protocols/[slug] — record a completed protocol run.
 *
 * Side effect: if the protocol is `daily_confidence`, the answer to the
 * `proof` prompt is also written into the user's confidence file with
 * kind='auto_protocol'. That's the auto-collection rule from the spec.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  const { slug } = await params;
  const protocol = getProtocol(slug);
  if (!protocol) {
    return NextResponse.json({ error: "Unknown protocol" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = protocolRunSchema.safeParse(body);
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
      slug,
      runDate: today,
      payload: parsed.data.payload,
      durationSeconds: parsed.data.durationSeconds,
    })
    .returning();

  // Auto-confidence rule: daily_confidence's proof answer becomes a
  // confidence entry. See spec §5 (Phase 5 auto-collection).
  if (slug === "daily_confidence" && parsed.data.payload.proof?.trim()) {
    await db.insert(lifeosConfidenceEntries).values({
      userId: user.id,
      workspaceId,
      kind: "auto_protocol",
      source: run.id,
      title: "Daily Confidence",
      body: parsed.data.payload.proof.trim(),
    });
  }

  return NextResponse.json({ ok: true, run });
}
