import Link from "next/link";
import { redirect } from "next/navigation";
import { Plate } from "@/components/field/plates";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { getTodayCheckin } from "@/lib/checkin/today";
import { dayOfYear, formatDay, localParts, todayKey } from "@/lib/time/day";
import { ManifestoCard } from "@/components/today/ManifestoCard";
import { QuestsCard } from "@/components/today/QuestsCard";
import { BalanceCard } from "@/components/today/BalanceCard";
import { PlanCard } from "@/components/today/PlanCard";
import { FocusHabitsCard } from "@/components/today/FocusHabitsCard";
import { FocusLive } from "@/components/today/FocusLive";
import {
  EveningSummaryCard,
  TomorrowSeed,
} from "@/components/today/EveningSummaryCard";
import { CollectionNote } from "@/components/today/CollectionNote";
import { DayArc } from "@/components/today/DayArc";

function greetingFor(h: number) {
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late night";
}

/**
 * Today, in three states. The page used to print the same sheet at 6am
 * and 9pm; now what leads depends on where the day has got to.
 *
 *   before the manifesto   the sun plate and the one orange action
 *   day open               the three lead at full size with working
 *                          boxes; the manifesto is one italic line under
 *                          them; a running focus block shows as a live
 *                          orange stamp
 *   day closed             the closed-day card leads, the three read
 *                          struck underneath, and one ink line points
 *                          forward
 *
 * The hour sets the greeting and, in the evening, lifts the close-the-
 * day row up under the three; it never changes what the day's record
 * says.
 */
export default async function TodayPage() {
  const { user, offline } = await getAuthContext();
  // No connection to the data: the desk where writing is kept, not a Today
  // page with nothing on it.
  if (offline) redirect("/offline");
  const checkin = user
    ? await getTodayCheckin(user.id)
    : { morning: null, evening: null };
  const morningDone = checkin.morning !== null;
  const eveningDone = checkin.evening !== null;
  const now = localParts();
  const today = todayKey();
  const eveningHours = now.hour >= 17 || now.hour < 4;

  const state: "before" | "open" | "closed" = eveningDone
    ? "closed"
    : morningDone
      ? "open"
      : "before";

  const closeRow = user && state === "open" && (
    <div className="sheet sheet-bare flex items-center justify-between gap-4 flex-wrap">
      <span className="t-read text-ink-300 m-0">
        {eveningHours
          ? "The day is winding down. Closing it is thirty seconds, or five cards."
          : "The day is still open. Closing it is thirty seconds, or five cards."}
      </span>
      <Link href="/evening" className="btn btn-spot shrink-0">
        Close the day
      </Link>
    </div>
  );

  return (
    <div className="max-w-[1080px] mx-auto">
      <header className="runhead flex items-start justify-between gap-5 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          {/* the pressed leaf: the day you are standing in, mounted */}
          <span className="plate-tile">
            <Plate name="leaf" size={46} className="hidden sm:block" />
            <Plate name="leaf" size={32} className="sm:hidden" />
          </span>
          <div className="min-w-0">
            <div
              className="text-xs text-ink-300"
              style={{ fontVariationSettings: "'wdth' 100, 'wght' 620" }}
            >
              {formatDay(today, "EEEE, d MMMM")}
              <span className="inline-block w-3 sm:w-5" />
              <b className="text-ink-50 tabular-nums whitespace-nowrap">No. {dayOfYear(today)}</b>
            </div>
            <h1 className="t-h1 mt-[7px]">
              {greetingFor(now.hour)}
              {user ? `, ${user.name?.split(" ")[0]}` : ""}.
            </h1>
          </div>
        </div>
        <div className="shrink-0">
          <span
            className={eveningDone ? "tab" : "tab tab-spot"}
            title={
              eveningDone
                ? "The evening shutdown is logged"
                : "The evening shutdown is still open"
            }
          >
            {eveningDone ? "Day closed" : "Day in motion"}
          </span>
        </div>
      </header>

      {!user && (
        <div className="sheet sheet-bare mb-5">
          <div className="t-h2">No session, so this is sample data</div>
          <p className="t-read text-ink-300 mt-2 max-w-[62ch]">
            Nothing on this page is yours yet. Pick a profile and your own
            check-ins will print here.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Link href="/pick-profile" className="btn btn-sm">
              Pick a profile
            </Link>
          </div>
        </div>
      )}

      <DayArc />

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-5 items-start">
        <div className="flex flex-col gap-5">
          {state === "before" && (
            <>
              <ManifestoCard mode="hero" />
              <FocusLive />
              <PlanCard />
            </>
          )}

          {state === "open" && (
            <>
              <FocusLive />
              <PlanCard variant="lead" />
              <ManifestoCard mode="line" />
              {closeRow}
            </>
          )}

          {state === "closed" && (
            <>
              <EveningSummaryCard />
              <FocusLive />
              <PlanCard variant="closed" />
              <ManifestoCard mode="line" />
              <TomorrowSeed />
            </>
          )}

          {user && (
            <div className="empty:hidden">
              <CollectionNote />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <FocusHabitsCard />
          <QuestsCard />
          <BalanceCard />
        </div>
      </div>

    </div>
  );
}
