import { and, desc, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { format, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { lifeosFocusSessions } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { FocusClient } from "@/components/focus/FocusClient";
import { PageStamp } from "@/components/PageStamp";

export default async function FocusPage() {
  const { user } = await requireUserContext();

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

  const dayStart = startOfDay(new Date());
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

      <FocusClient
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
