import Link from "next/link";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { getInsights, type InsightsWindow } from "@/lib/insights/queries";
import { detectPatterns } from "@/lib/insights/patterns";
import { getLatestBalance, getYearHeatmap } from "@/lib/reflection/auto-detect";
import { StatCards } from "@/components/insights/StatCards";
import { Trends } from "@/components/insights/Trends";
import { PatternList } from "@/components/insights/PatternList";
import { BalanceSheet } from "@/components/insights/BalanceSheet";
import { YearHeatmap } from "@/components/reflection/YearHeatmap";
import { PageStamp } from "@/components/PageStamp";

const WINDOWS: { days: InsightsWindow; label: string; sub: string }[] = [
  { days: 7, label: "7 days", sub: "The last seven days, and what is showing in them." },
  { days: 30, label: "30 days", sub: "The last thirty days, and what is showing in them." },
  { days: 365, label: "The year", sub: "The last year, and what is showing in it." },
];

function parseWindow(raw: string | string[] | undefined): InsightsWindow {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "7" ? 7 : v === "365" ? 365 : 30;
}

/**
 * One looking-back page. Discipline's seven-day scorecard, balance and
 * year grid folded in here, so the record is read from one sheet with a
 * window chip rather than from two pages that overlapped.
 *
 * The window is a query string, not client state, so a window can be
 * linked to and the back button means something.
 */
export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireUserContext();
  const params = await searchParams;
  const windowDays = parseWindow(params.window);
  const current = WINDOWS.find((w) => w.days === windowDays)!;

  const [data, heatmap, balance] = await Promise.all([
    getInsights(user.id, windowDays),
    getYearHeatmap(user.id),
    getLatestBalance(user.id),
  ]);
  const patterns = detectPatterns(data);

  return (
    <div className="max-w-5xl mx-auto">
      <PageStamp
        title="Insights"
        subtitle={current.sub}
        right={
          <Link href="/weekly-review" className="btn btn-sm">
            Run weekly review
          </Link>
        }
      />

      <div className="tabstrip" role="tablist" aria-label="Window">
        {WINDOWS.map((w) => (
          <Link
            key={w.days}
            href={w.days === 30 ? "/insights" : `/insights?window=${w.days}`}
            role="tab"
            aria-selected={w.days === windowDays}
            aria-current={w.days === windowDays ? "page" : undefined}
          >
            {w.label}
          </Link>
        ))}
      </div>
      <div className="mb-8">
        <StatCards data={data} />
      </div>

      <div className="mb-8">
        <PatternList patterns={patterns} />
      </div>

      <div className="mb-8">
        <BalanceSheet balance={balance} />
      </div>

      {windowDays !== 365 && (
        <div className="mb-8">
          <Trends data={data} />
        </div>
      )}

      <section>
        <div className="tab-row">
          <span className="tab">The year</span>
          <span className="fill" />
          <span className="text-[11.5px] text-ink-400">
            every day with a check-in
          </span>
        </div>
        <YearHeatmap cells={heatmap} />
      </section>
    </div>
  );
}
