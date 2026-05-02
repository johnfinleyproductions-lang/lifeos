import Link from "next/link";

/**
 * Phase 1: hardcoded mock — shows the empty state.
 * Phase 2 wires this up to read today's `lifeos_daily_checkins.morning` row.
 */
export function ManifestoCard() {
  const hasManifesto = false;

  return (
    <div className="card">
      <div className="card-glow" />
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
            Morning manifesto
          </div>
          {hasManifesto ? (
            <>
              <p className="font-serif text-2xl text-ink-50 leading-snug">
                Today, the version of me showing up{" "}
                <span className="text-accent-green">finishes things</span>.
              </p>
              <p className="text-sm text-ink-300 mt-2">
                Energy 4/5 · 2 priorities locked
              </p>
            </>
          ) : (
            <>
              <p className="font-serif text-2xl text-ink-50 leading-snug">
                The day hasn&apos;t started yet.
              </p>
              <p className="text-sm text-ink-300 mt-2">
                Five quick prompts to set your intention. Takes about 90
                seconds.
              </p>
            </>
          )}
        </div>
        <div className="shrink-0">
          <Link
            href="/morning"
            className="inline-block px-4 py-2 rounded-lg bg-accent-green/15 text-accent-green border border-accent-green/30 text-sm hover:bg-accent-green/25 transition"
          >
            {hasManifesto ? "View" : "Start"} →
          </Link>
        </div>
      </div>
    </div>
  );
}
