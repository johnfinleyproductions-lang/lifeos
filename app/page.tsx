import Link from "next/link";
import { format } from "date-fns";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { getTodayCheckin } from "@/lib/checkin/today";
import { ManifestoCard } from "@/components/today/ManifestoCard";
import { QuestsCard } from "@/components/today/QuestsCard";
import { BalanceCard } from "@/components/today/BalanceCard";
import { PlanCard } from "@/components/today/PlanCard";
import { FocusHabitsCard } from "@/components/today/FocusHabitsCard";
import { EveningSummaryCard } from "@/components/today/EveningSummaryCard";

function greetingFor(date: Date) {
  const h = date.getHours();
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
  const now = new Date();
  const greeting = greetingFor(now);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-ink-400 mb-1">
            {format(now, "EEEE · MMMM d")}
          </div>
          <h1 className="font-serif text-4xl tracking-tight text-ink-50">
            {greeting}
            {user ? `, ${user.name?.split(" ")[0]}` : ""}.
          </h1>
        </div>
        <div className="text-right text-sm text-ink-300">
          <div>{eveningDone ? "Day closed" : "Day in motion"}</div>
          <div className="text-ink-400 text-xs mt-0.5">Phase 2 · live</div>
        </div>
      </header>

      {!user && (
        <div className="card mb-6 border-accent-gold/20 bg-accent-gold/5">
          <div className="font-serif text-lg text-ink-50 mb-1">
            You&apos;re viewing LifeOS in dev mode
          </div>
          <p className="text-sm text-ink-200 mb-3">
            This page renders with mock data because no Evergreen Core session
            was found. Sign in over at EC, then come back — your name and your
            real check-in data will populate here.
          </p>
          <Link
            href={`${
              process.env.NEXT_PUBLIC_EC_URL?.trim() ||
              "http://localhost:3000"
            }/auth`}
            className="inline-block text-xs px-3 py-1.5 rounded-lg bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30 transition"
          >
            Open Evergreen Core →
          </Link>
        </div>
      )}

      <div className="mb-6">
        <ManifestoCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <QuestsCard />
        <BalanceCard />
        <PlanCard />
        <FocusHabitsCard />
      </div>

      <EveningSummaryCard />

      {!eveningDone && user && (
        <div className="mt-6 flex items-center justify-end">
          <Link
            href="/evening"
            className="text-xs text-ink-400 hover:text-ink-100 transition"
          >
            End the day → evening shutdown
          </Link>
        </div>
      )}
    </div>
  );
}
