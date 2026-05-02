/**
 * Phase 1: hardcoded mock.
 * Phase 2 wires this up to read today's morning manifesto priorities.
 * Phase 9 cross-links priorities to EC's `build_log_entries` for auto-tick.
 */
export function PlanCard() {
  return (
    <div className="card">
      <div className="card-glow" />
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
        Today&apos;s plan
      </div>
      <div className="font-serif text-lg text-ink-100 mb-3">
        Set after morning manifesto
      </div>
      <div className="space-y-2 text-sm text-ink-300">
        <div className="flex items-start gap-2">
          <span className="w-4 h-4 rounded border border-ink-500 mt-0.5 shrink-0" />
          <span>Priority one will appear here</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-4 h-4 rounded border border-ink-500 mt-0.5 shrink-0" />
          <span>Priority two will appear here</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-4 h-4 rounded border border-ink-500 mt-0.5 shrink-0" />
          <span>Priority three will appear here</span>
        </div>
      </div>
    </div>
  );
}
