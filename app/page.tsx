import Link from "next/link";
import { Plate } from "@/components/field/plates";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { getTodayCheckin } from "@/lib/checkin/today";
import { dayOfYear, formatDay, localParts, todayKey } from "@/lib/time/day";
import { ManifestoCard } from "@/components/today/ManifestoCard";
import { QuestsCard } from "@/components/today/QuestsCard";
import { BalanceCard } from "@/components/today/BalanceCard";
import { PlanCard } from "@/components/today/PlanCard";
import { FocusHabitsCard } from "@/components/today/FocusHabitsCard";
import { EveningSummaryCard } from "@/components/today/EveningSummaryCard";
import { CollectionNote } from "@/components/today/CollectionNote";

function greetingFor(h: number) {
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late night";
}

export default async function TodayPage() {
  const { user } = await getAuthContext();
  const eveningDone = user
    ? (await getTodayCheckin(user.id)).evening !== null
    : false;
  const now = localParts();
  const today = todayKey();

  return (
    <div className="max-w-[1080px] mx-auto">
      <header className="flex items-start justify-between gap-5 mb-6">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* the pressed leaf: the day you are standing in */}
          <span className="shrink-0 text-ink-50 mt-1 hidden sm:block">
            <Plate name="leaf" />
          </span>
          <div className="min-w-0">
            <div
              className="text-xs text-ink-300"
              style={{ fontVariationSettings: "'wdth' 100, 'wght' 620" }}
            >
              {formatDay(today, "EEEE, d MMMM")}
              <span className="inline-block w-5" />
              <b className="text-ink-50 tabular-nums">No. {dayOfYear(today)}</b>
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
            Nothing on this page is yours yet. Pick a profile, or sign in over
            at Evergreen Core, and your real check-ins will populate here.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Link href="/pick-profile" className="btn btn-sm">
              Pick a profile
            </Link>
            <Link
              href={`${
                process.env.NEXT_PUBLIC_EC_URL?.trim() || "http://localhost:3000"
              }/auth`}
              className="btn btn-sm btn-ghost"
            >
              Open Evergreen Core
            </Link>
          </div>
        </div>
      )}

      {/* The manifesto is the largest thing on the page. Everything else
          stays quiet around it. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-5 items-start">
        <div>
          <ManifestoCard />
          <div className="mt-5">
            <PlanCard />
          </div>
          <div className="mt-5">
            <EveningSummaryCard />
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <FocusHabitsCard />
          <QuestsCard />
          <BalanceCard />
        </div>
      </div>

      {user && (
        <div className="mt-5 empty:hidden">
          <CollectionNote />
        </div>
      )}

      {!eveningDone && user && (
        <div className="sheet sheet-bare mt-5 flex items-center justify-between gap-4">
          <span className="t-read text-ink-300 m-0">
            The day is still open. The shutdown takes about four minutes.
          </span>
          <Link href="/evening" className="btn btn-spot shrink-0">
            Close the day
          </Link>
        </div>
      )}
    </div>
  );
}
