import { and, desc, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { startOfDay, todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosFocusSessions } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { FocusClient } from "@/components/focus/FocusClient";
import { PageStamp } from "@/components/PageStamp";
import { DayArc } from "@/components/today/DayArc";

export default async function FocusPage({
  searchParams,
}: {
  searchParams: Promise<{ label?: string }>;
}) {
  const { user } = await requireUserContext();
  // Today hands a priority over as ?label=, so the block starts named.
  const handed = (await searchParams).label?.trim().slice(0, 140) ?? "";

  const [active] = await db
    .select()
    .from(lifeosFocusSessions)
    .where(
      and(
        eq(lifeosFocusSessions.userId, user.id),
        isNull(lifeosFocusSessions.endedAt),
      ),
    )
    .limit(1);

  const dayStart = startOfDay(todayKey());
  const completed = await db
    .select()
    .from(lifeosFocusSessions)
    .where(
      and(
        eq(lifeosFocusSessions.userId, user.id),
        isNotNull(lifeosFocusSessions.endedAt),
        gte(lifeosFocusSessions.startedAt, dayStart),
      ),
    )
    .orderBy(desc(lifeosFocusSessions.startedAt));

  const totalMinutes = completed.reduce(
    (sum, s) => sum + (s.durationMinutes ?? 0),
    0,
  );

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp title="Focus" subtitle="Where the work actually happens." />
      {/* the same strip Today carries: each sit is a block on it */}
      <DayArc />

      <FocusClient
        initialLabel={handed}
        active={
          active
            ? {
                id: active.id,
                label: active.label,
                startedAt: active.startedAt.toISOString(),
              }
            : null
        }
        today={completed.map((s) => ({
          id: s.id,
          label: s.label,
          durationMinutes: s.durationMinutes ?? 0,
          startedAt: s.startedAt.toISOString(),
        }))}
        totalMinutes={totalMinutes}
      />
    </div>
  );
}
