"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { eveningShutdownSchema } from "@/lib/manifesto/evening-schema";

/**
 * Strike (or unstrike) one of today's three from the Today page.
 *
 * The flag is index-aligned with the morning's `priorities`, the same
 * shape the evening wizard writes. Where it lands depends on what
 * exists: into the evening jsonb if the shutdown is already logged,
 * otherwise into the morning jsonb under the same key, where the
 * evening wizard can pick it up as its starting state. Either way the
 * strike survives a reload.
 *
 * A server action rather than a route so the write stays beside the
 * component that makes it; the morning and evening routes are owned
 * by the wizards and write their whole column at once.
 */
export async function strikePriority(
  index: number,
  done: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { user } = await getAuthContext();
  if (!user) return { ok: false, error: "No profile" };
  if (!Number.isInteger(index) || index < 0 || index > 2) {
    return { ok: false, error: "Not one of the three" };
  }

  const [row] = await db
    .select({
      id: lifeosDailyCheckins.id,
      morning: lifeosDailyCheckins.morning,
      evening: lifeosDailyCheckins.evening,
    })
    .from(lifeosDailyCheckins)
    .where(
      and(
        eq(lifeosDailyCheckins.userId, user.id),
        eq(lifeosDailyCheckins.entryDate, todayKey()),
      ),
    )
    .limit(1);
  if (!row || !row.morning || typeof row.morning !== "object") {
    return { ok: false, error: "No manifesto today" };
  }

  const morning = row.morning as Record<string, unknown>;
  const priorities = Array.isArray(morning.priorities)
    ? morning.priorities
    : [];
  if (index >= priorities.length) {
    return { ok: false, error: "Not one of the three" };
  }

  const evening =
    row.evening != null ? eveningShutdownSchema.safeParse(row.evening) : null;

  if (evening?.success) {
    const flags = [...(evening.data.prioritiesDone ?? [])];
    while (flags.length < priorities.length) flags.push(false);
    flags[index] = done;
    await db
      .update(lifeosDailyCheckins)
      .set({
        evening: { ...(row.evening as object), prioritiesDone: flags },
        updatedAt: new Date(),
      })
      .where(eq(lifeosDailyCheckins.id, row.id));
  } else {
    const existing = Array.isArray(morning.prioritiesDone)
      ? morning.prioritiesDone.map((x) => x === true)
      : [];
    const flags = [...existing];
    while (flags.length < priorities.length) flags.push(false);
    flags[index] = done;
    await db
      .update(lifeosDailyCheckins)
      .set({
        morning: { ...morning, prioritiesDone: flags },
        updatedAt: new Date(),
      })
      .where(eq(lifeosDailyCheckins.id, row.id));
  }

  revalidatePath("/");
  return { ok: true };
}
