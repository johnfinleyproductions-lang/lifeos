import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { eveningShutdownSchema } from "@/lib/manifesto/evening-schema";

/**
 * Which of today's three are struck, read from wherever the strike was
 * recorded.
 *
 * Before the shutdown, a strike made on Today is kept as a
 * `prioritiesDone` array inside the morning jsonb. The morning schema
 * does not know the key and strips it on parse, which is why
 * getTodayCheckin never sees it and this reads the raw row instead.
 * Once the evening row exists its own `prioritiesDone` is the record,
 * and a strike on Today writes there.
 *
 * Nothing here can fail loudly: a row with neither key reads as nothing
 * struck, which is also what it means.
 */
export type TodayStrikes = {
  rowId: string | null;
  done: boolean[];
  source: "evening" | "morning" | "none";
};

const readFlags = (raw: unknown): boolean[] | null => {
  if (!raw || typeof raw !== "object") return null;
  const v = (raw as Record<string, unknown>).prioritiesDone;
  return Array.isArray(v) ? v.map((x) => x === true) : null;
};

export const getTodayStrikes = cache(
  async (userId: string): Promise<TodayStrikes> => {
    const [row] = await db
      .select({
        id: lifeosDailyCheckins.id,
        morning: lifeosDailyCheckins.morning,
        evening: lifeosDailyCheckins.evening,
      })
      .from(lifeosDailyCheckins)
      .where(
        and(
          eq(lifeosDailyCheckins.userId, userId),
          eq(lifeosDailyCheckins.entryDate, todayKey()),
        ),
      )
      .limit(1);
    if (!row) return { rowId: null, done: [], source: "none" };

    const evening =
      row.evening != null ? eveningShutdownSchema.safeParse(row.evening) : null;
    if (evening?.success) {
      return {
        rowId: row.id,
        done: evening.data.prioritiesDone ?? [],
        source: "evening",
      };
    }
    const fromMorning = readFlags(row.morning);
    return {
      rowId: row.id,
      done: fromMorning ?? [],
      source: fromMorning ? "morning" : "none",
    };
  },
);
