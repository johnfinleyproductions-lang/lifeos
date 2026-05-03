import Link from "next/link";
import { format } from "date-fns";
import { requireUserContext } from "@/lib/auth/server-helpers";
import {
  getScorecard,
  getYearHeatmap,
  getLatestBalance,
} from "@/lib/reflection/auto-detect";
import { YearHeatmap } from "@/components/reflection/YearHeatmap";
import { BALANCE_DIMENSIONS } from "@/lib/reflection/balance";

export default async function DisciplinePage() {
  const { user } = await requireUserContext();

  const [scorecard, heatmap, balance] = await Promise.all([
    getScorecard(user.id),
    getYearHeatmap(user.id),
    getLatestBalance(user.id),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          ← Today
        </Link>
        <div className="text-xs text-ink-400 uppercase tracking-[0.18em]">
          {format(new Date(), "EEEE · MMMM d")}
        </div>
      </div>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-ink-50 mb-1">Discipline</h1>
          <p className="text-sm text-ink-300">
            The pattern of how you actually live.
          </p>
        </div>
        <Link
          href="/weekly-review"
          className="px-4 py-2 rounded-lg bg-accent-gold/15 text-accent-gold border border-accent-gold/30 text-sm hover:bg-accent-gold/25 transition"
        >
          Run weekly review →
        </Link>
      </div>

      {/* 7-day scorecard */}
      <section className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
          Last 7 days
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat
            label="Morning ✓"
            value={`${scorecard.morningDays}`}
            unit="/ 7"
            accent="text-accent-green"
          />
          <Stat
            label="Evening ✓"
            value={`${scorecard.eveningDays}`}
            unit="/ 7"
            accent="text-accent-rose"
          />
          <Stat
            label="Habits hit"
            value={`${scorecard.habitPct}`}
            unit="%"
            accent="text-accent-green"
          />
          <Stat
            label="Focus min"
            value={String(scorecard.focusMinutes)}
            accent="text-accent-sky"
          />
          <Stat
            label="Focus sessions"
            value={String(scorecard.focusSessions)}
            accent="text-accent-sky"
          />
          <Stat
            label="Quest avg"
            value={`${scorecard.questAvgProgress}`}
            unit="%"
            accent="text-accent-violet"
          />
        </div>
      </section>

      {/* Balance from latest weekly review */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-xs uppercase tracking-[0.18em] text-ink-400">
            Balance · most recent review
          </div>
          {!balance && (
            <div className="text-[11px] text-ink-400">
              Run a weekly review to populate.
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-glow" />
          {balance ? (
            <div className="space-y-2">
              {BALANCE_DIMENSIONS.map((d) => (
                <div key={d.key} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-ink-200">{d.label}</div>
                  <div className="flex-1 h-2 bg-ink-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${d.accentClass} rounded-full transition-all`}
                      style={{ width: `${(balance[d.key] / 10) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm text-ink-400 tabular-nums">
                    {balance[d.key]}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-ink-300 italic">
              No balance data yet. The weekly review captures it.
            </div>
          )}
        </div>
      </section>

      {/* Year heatmap */}
      <section>
        <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
          The year
        </div>
        <YearHeatmap cells={heatmap} />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent: string;
}) {
  return (
    <div className="card">
      <div className="card-glow" />
      <div className={`text-[10px] uppercase tracking-wider mb-1 ${accent}`}>
        {label}
      </div>
      <div className="font-serif text-2xl text-ink-50 tabular-nums">
        {value}
        {unit && (
          <span className="text-sm text-ink-400 ml-1">{unit}</span>
        )}
      </div>
    </div>
  );
}
