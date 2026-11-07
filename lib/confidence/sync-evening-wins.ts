import { and, eq, isNotNull, like } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  lifeosConfidenceEntries,
  lifeosDailyCheckins,
} from "@/lib/db/schema/lifeos";
import { eveningShutdownSchema } from "@/lib/manifesto/evening-schema";
import { startOfDay } from "@/lib/time/day";

/**
 * File the evening win into the confidence file.
 *
 * Daily Confidence used to be the one protocol whose first answer was
 * filed automatically. It is retired, because the evening shutdown
 * already asks for the day's win; this keeps the side effect by filing
 * that win instead, with kind 'auto_evening' and the check-in's id as
 * its source, so each evening files once and an edited win is not
 * filed twice.
 *
 * Called from POST /api/evening, on the write. It briefly ran when the
 * Identity page was read, which meant rendering a page inserted rows: a
 * GET that mutates is surprising on its own, and it also made the file
 * depend on someone visiting the right page. Idempotent either way, and
 * never more than one insert per closed day.
 */
export async function syncEveningWins(userId: string): Promise<number> {
  const [checkins, filed] = await Promise.all([
    db
      .select({
        id: lifeosDailyCheckins.id,
        entryDate: lifeosDailyCheckins.entryDate,
        evening: lifeosDailyCheckins.evening,
      })
      .from(lifeosDailyCheckins)
      .where(
        and(
          eq(lifeosDailyCheckins.userId, userId),
          isNotNull(lifeosDailyCheckins.evening),
        ),
      ),
    db
      .select({ source: lifeosConfidenceEntries.source })
      .from(lifeosConfidenceEntries)
      .where(
        and(
          eq(lifeosConfidenceEntries.userId, userId),
          like(lifeosConfidenceEntries.source, "evening:%"),
        ),
      ),
  ]);

  const already = new Set(filed.map((f) => f.source));
  const rows = [];
  for (const c of checkins) {
    const key = `evening:${c.id}`;
    if (already.has(key)) continue;
    const parsed = eveningShutdownSchema.safeParse(c.evening);
    if (!parsed.success) continue;
    const win = parsed.data.win.trim();
    if (!win) continue;
    rows.push({
      userId,
      kind: "auto_evening",
      source: key,
      title: "The day's win",
      body: win,
      // dated to the evening it came from (nine o'clock on that day in
      // the household zone), so the file reads in the order the days
      // were lived rather than the order they were filed
      createdAt: new Date(startOfDay(c.entryDate).getTime() + 21 * 3_600_000),
    });
  }
  if (rows.length > 0) {
    await db.insert(lifeosConfidenceEntries).values(rows);
  }
  return rows.length;
}
