import Link from "next/link";
import { format } from "date-fns";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { getInsights } from "@/lib/insights/queries";
import { detectPatterns } from "@/lib/insights/patterns";
import { StatCards } from "@/components/insights/StatCards";
import { Trends } from "@/components/insights/Trends";
import { PatternList } from "@/components/insights/PatternList";

export default async function InsightsPage() {
  const { user } = await requireUserContext();
  const data = await getInsights(user.id, 30);
  const patterns = detectPatterns(data);

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

      <h1 className="font-serif text-3xl text-ink-50 mb-1">Insights</h1>
      <p className="text-sm text-ink-300 mb-8">
        Last {data.windowDays} days — what&apos;s emerging in the data.
      </p>

      <section className="mb-10">
        <StatCards data={data} />
      </section>

      <section className="mb-10">
        <PatternList patterns={patterns} />
      </section>

      <section>
        <Trends data={data} />
      </section>
    </div>
  );
}
