import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { lifeosFocusSessions } from "@/lib/db/schema/lifeos";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { formatInstant, now } from "@/lib/time/day";
import { Stamp } from "@/components/field/Stamp";

/**
 * A focus block that is running right now, as a live stamp.
 *
 * This is the one thing on Today that is literally happening at this
 * moment, so it is the one place the spot ink is spent as a stamp
 * while the day is open: a running block, its label, and the minute
 * it began. Renders nothing when no block is open, which is most of
 * the time.
 */
export async function FocusLive() {
  const { user } = await getAuthContext();
  if (!user) return null;

  const [active] = await db
    .select({
      id: lifeosFocusSessions.id,
      label: lifeosFocusSessions.label,
      startedAt: lifeosFocusSessions.startedAt,
    })
    .from(lifeosFocusSessions)
    .where(
      and(
        eq(lifeosFocusSessions.userId, user.id),
        isNull(lifeosFocusSessions.endedAt),
      ),
    )
    .limit(1);
  if (!active) return null;

  const minutes = Math.max(
    0,
    Math.round((now().getTime() - active.startedAt.getTime()) / 60_000),
  );

  return (
    <Link
      href="/focus"
      className="sheet sheet-hi flex items-center gap-4 flex-wrap hover:shadow-mis-ink"
    >
      <Stamp
        title="In the hide"
        line={`since ${formatInstant(active.startedAt, "h:mm a")}`}
        className="stamp-live shrink-0"
      />
      <span className="flex-1 min-w-[16ch]">
        <span
          className="block text-[15.5px] leading-[1.3]"
          style={{ fontVariationSettings: "'wght' 680" }}
        >
          {active.label}
        </span>
        <span className="block text-[12.5px] text-ink-300 mt-0.5 tabular-nums">
          {minutes === 0 ? "just started" : `${minutes} min so far`}, still
          running
        </span>
      </span>
      <span className="btn btn-sm btn-ghost shrink-0">Open focus</span>
    </Link>
  );
}
