import { requireUserContext } from "@/lib/auth/server-helpers";
import { getInsights } from "@/lib/insights/queries";
import { detectPatterns } from "@/lib/insights/patterns";
import { StatCards } from "@/components/insights/StatCards";
import { Trends } from "@/components/insights/Trends";
import { PatternList } from "@/components/insights/PatternList";
import { PageStamp } from "@/components/PageStamp";

export default async function InsightsPage() {
  const { user } = await requireUserContext();
  const data = await getInsights(user.id, 30);
  const patterns = detectPatterns(data);

  return (
    <div className="max-w-5xl mx-auto">
      <PageStamp />

      <h1 className="t-h1 text-ink-50 mb-1">Insights</h1>
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
