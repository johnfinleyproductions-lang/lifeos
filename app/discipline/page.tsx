import Link from "next/link";
import { requireUserContext } from "@/lib/auth/server-helpers";
import {
  getScorecard,
  getYearHeatmap,
  getLatestBalance,
} from "@/lib/reflection/auto-detect";
import { YearHeatmap } from "@/components/reflection/YearHeatmap";
import { BALANCE_DIMENSIONS } from "@/lib/reflection/balance";
import { PageStamp } from "@/components/PageStamp";

export default async function DisciplinePage() {
  const { user } = await requireUserContext();

  const [scorecard, heatmap, balance] = await Promise.all([
    getScorecard(user.id),
    getYearHeatmap(user.id),
    getLatestBalance(user.id),
  ]);

  return (
    <div className="max-w-5xl mx-auto">
      <PageStamp
        title="Discipline"
        subtitle="The pattern of how you actually live."
        right={
          <Link href="/weekly-review" className="btn btn-sm">
            Run weekly review
          </Link>
        }
      />

      <section className="mb-8">
        <div className="tab-row">
          <span className="tab">Last seven days</span>
          <span className="fill" />
        </div>
        <div className="sheet grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-5">
          <Stat label="Mornings" value={`${scorecard.morningDays}`} unit="/7" />
          <Stat label="Evenings" value={`${scorecard.eveningDays}`} unit="/7" />
          <Stat
            label="Habits struck"
            value={`${scorecard.habitPct}`}
            unit="%"
          />
          <Stat
            label="Focus"
            value={String(scorecard.focusMinutes)}
            unit="min"
          />
          <Stat label="Focus blocks" value={String(scorecard.focusSessions)} />
          <Stat
            label="Quest average"
            value={`${scorecard.questAvgProgress}`}
            unit="%"
          />
        </div>
      </section>

      <section className="mb-8">
        <div className="tab-row">
          <span className="tab">Balance</span>
          <span className="fill" />
          <span className="text-[11.5px] text-ink-400">
            {balance ? "most recent review" : "no review yet"}
          </span>
        </div>
        <div className="sheet">
          {balance ? (
            <div className="flex flex-col gap-2">
              {BALANCE_DIMENSIONS.map((d) => (
                <div key={d.key} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-[13px] text-ink-300">
                    {d.label}
                  </span>
                  <span className="plot flex-1">
                    <span
                      className={d.accentClass}
                      style={{ width: `${(balance[d.key] / 10) * 100}%` }}
                    />
                  </span>
                  <span className="w-8 text-right text-[12.5px] text-ink-400 tabular-nums">
                    {balance[d.key]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14.5px] text-ink-300 m-0">
              No balance readings yet. The weekly review takes them.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="tab-row">
          <span className="tab">The year</span>
          <span className="fill" />
          <span className="text-[11.5px] text-ink-400">
            365 days of check-ins
          </span>
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
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div>
      <div className="stat-l">{label}</div>
      <div className="stat-v">
        {value}
        {unit && <small>{unit}</small>}
      </div>
    </div>
  );
}
