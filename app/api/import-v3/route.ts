import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { requireActiveWorkspaceId } from "@/lib/workspace/active";
import { v3ImportSchema } from "@/lib/manifesto/v3-import-schema";

/**
 * POST /api/import-v3 — bulk-import v3 JSON export.
 *
 * Per-entry behavior:
 *  - If a row exists for (user_id, date), update morning/evening (only if
 *    the import payload has non-null values; preserves existing data
 *    otherwise).
 *  - If no row exists, insert one.
 *
 * Returns counts so the client knows how many rows landed.
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

  const parsed = v3ImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const workspaceId = await requireActiveWorkspaceId(user.id);

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { date: string; reason: string }[] = [];

  // Sequential to keep the DB happy and to give us deterministic counts.
  // 1000-entry cap from the schema means worst case ~1000 round trips —
  // acceptable for an import tool.
  for (const entry of parsed.data.entries) {
    try {
      const existing = await db
        .select({
          id: lifeosDailyCheckins.id,
          morning: lifeosDailyCheckins.morning,
          evening: lifeosDailyCheckins.evening,
        })
        .from(lifeosDailyCheckins)
        .where(
          and(
            eq(lifeosDailyCheckins.userId, user.id),
            eq(lifeosDailyCheckins.entryDate, entry.date),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        const row = existing[0];
        await db
          .update(lifeosDailyCheckins)
          .set({
            morning: entry.morning ?? row.morning,
            evening: entry.evening ?? row.evening,
            ...(entry.ritualDepth ? { ritualDepth: entry.ritualDepth } : {}),
            updatedAt: new Date(),
          })
          .where(eq(lifeosDailyCheckins.id, row.id));
        updated++;
      } else {
        await db.insert(lifeosDailyCheckins).values({
          userId: user.id,
          workspaceId,
          entryDate: entry.date,
          morning: entry.morning ?? null,
          evening: entry.evening ?? null,
          ...(entry.ritualDepth ? { ritualDepth: entry.ritualDepth } : {}),
        });
        imported++;
      }
    } catch (e) {
      skipped++;
      errors.push({
        date: entry.date,
        reason: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    imported,
    updated,
    skipped,
    total: parsed.data.entries.length,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
