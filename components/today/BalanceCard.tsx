/**
 * Phase 1: hardcoded mock.
 * Phase 6 wires up the rolling 7-day balance score.
 */
const DIMENSIONS = [
  { label: "Mind", score: 0, color: "bg-accent-violet" },
  { label: "Body", score: 0, color: "bg-accent-green" },
  { label: "Work", score: 0, color: "bg-accent-sky" },
  { label: "Relationships", score: 0, color: "bg-accent-rose" },
  { label: "Play", score: 0, color: "bg-accent-gold" },
  { label: "Spirit", score: 0, color: "bg-ink-300" },
];

export function BalanceCard() {
  return (
    <div className="card">
      <div className="card-glow" />
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
        Balance score · 7 days
      </div>
      <div className="font-serif text-lg text-ink-100 mb-3">
        Begins after first check-in
      </div>
      <div className="space-y-1.5">
        {DIMENSIONS.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <div className="w-20 text-xs text-ink-300">{d.label}</div>
            <div className="flex-1 h-1.5 bg-ink-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${d.color} rounded-full opacity-30`}
                style={{ width: `${d.score}%` }}
              />
            </div>
            <div className="w-7 text-right text-[11px] text-ink-400 tabular-nums">
              {d.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
