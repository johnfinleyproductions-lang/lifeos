import type { Pattern } from "@/lib/insights/patterns";

export function PatternList({ patterns }: { patterns: Pattern[] }) {
  if (patterns.length === 0) {
    return (
      <div className="card text-center py-8">
        <div className="card-glow" />
        <p className="text-sm text-ink-300">
          Not enough data yet to spot patterns. Check back after a few more
          check-ins, journal entries, or focus sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-3">
        What I&apos;m noticing
      </div>
      {patterns.map((p, i) => (
        <div key={i} className="card flex gap-4 py-4">
          <div className="card-glow" />
          <div className="text-2xl shrink-0 leading-none mt-0.5">
            {p.emoji}
          </div>
          <div>
            <div className="font-serif text-base text-ink-100 mb-0.5">
              {p.title}
            </div>
            <div className="text-sm text-ink-300 leading-relaxed">
              {p.body}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
