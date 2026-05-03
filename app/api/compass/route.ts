import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosCompass } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { requireActiveWorkspaceId } from "@/lib/workspace/active";
import { upsertCompassSchema } from "@/lib/compass/schema";

/**
 * PATCH /api/compass — upsert the user's single compass row.
 *
 * Body can contain any subset of fields (mission, eulogy, successDefinition,
 * futurePaths, idealWeek). Missing fields are left unchanged.
 *
 * One row per user (UNIQUE constraint on user_id), so upsert is the
 * natural shape.
 */
export async function PATCH(request: Request) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = upsertCompassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const workspaceId = await requireActiveWorkspaceId(user.id);

  const [existing] = await db
    .select({ id: lifeosCompass.id })
    .from(lifeosCompass)
    .where(eq(lifeosCompass.userId, user.id))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(lifeosCompass)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(lifeosCompass.id, existing.id))
      .returning();
    return NextResponse.json({ ok: true, updated: true, compass: updated });
  }

  const [created] = await db
    .insert(lifeosCompass)
    .values({
      userId: user.id,
      workspaceId,
      ...parsed.data,
    })
    .returning();
  return NextResponse.json({ ok: true, created: true, compass: created });
}
