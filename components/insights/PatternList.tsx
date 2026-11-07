import type { Pattern } from "@/lib/insights/patterns";

/**
 * The detected patterns as numbered entries in a single sheet. The data
 * carries an emoji per pattern; this system sets a numeral in the
 * display face instead.
 */
export function PatternList({ patterns }: { patterns: Pattern[] }) {
  return (
    <section>
      <div className="tab-row">
        <span className="tab">What is showing</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400 tabular-nums">
          {patterns.length} {patterns.length === 1 ? "pattern" : "patterns"}
        </span>
      </div>

      {patterns.length === 0 ? (
        <div className="sheet sheet-bare border-dashed text-center py-8">
          <p className="text-[14.5px] text-ink-300 m-0 mx-auto max-w-[44ch]">
            Not enough data yet to spot patterns. Check back after a few more
            check-ins, journal entries, or focus sessions.
          </p>
        </div>
      ) : (
        <div className="sheet py-1">
          {patterns.map((p, i) => (
            <div
              key={i}
              className="flex gap-4 py-3.5 border-b border-ink-600 last:border-b-0"
            >
              <span
                className="w-[26px] shrink-0 tabular-nums text-[15px] text-ink-400 pt-[2px]"
                style={{ fontVariationSettings: "'wdth' 80, 'wght' 800" }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <div
                  className="text-[15.5px] leading-[1.25]"
                  style={{ fontVariationSettings: "'wdth' 100, 'wght' 680" }}
                >
                  {p.title}
                </div>
                <div className="text-[14px] text-ink-300 leading-[1.45] mt-1">
                  {p.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
