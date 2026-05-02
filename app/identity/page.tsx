import Link from "next/link";
import { format } from "date-fns";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  lifeosConfidenceEntries,
  lifeosProtocolRuns,
  lifeosDailyCheckins,
} from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { PROTOCOLS, ACCENT_TEXT } from "@/lib/protocols/definitions";
import { morningManifestoSchema } from "@/lib/manifesto/schema";

export default async function IdentityPage() {
  const { user } = await requireUserContext();

  // Latest morning manifesto for the identity statement
  const [latestCheckin] = await db
    .select()
    .from(lifeosDailyCheckins)
    .where(eq(lifeosDailyCheckins.userId, user.id))
    .orderBy(desc(lifeosDailyCheckins.entryDate))
    .limit(1);

  const morningParse = latestCheckin?.morning
    ? morningManifestoSchema.safeParse(latestCheckin.morning)
    : null;
  const identityStatement =
    morningParse && morningParse.success ? morningParse.data.manifesto : null;

  // Recent confidence entries (last 10)
  const confidenceEntries = await db
    .select()
    .from(lifeosConfidenceEntries)
    .where(eq(lifeosConfidenceEntries.userId, user.id))
    .orderBy(desc(lifeosConfidenceEntries.createdAt))
    .limit(10);

  // Latest future letter run
  const [latestFutureLetter] = await db
    .select()
    .from(lifeosProtocolRuns)
    .where(
      and(
        eq(lifeosProtocolRuns.userId, user.id),
        eq(lifeosProtocolRuns.slug, "future_letter"),
      ),
    )
    .orderBy(desc(lifeosProtocolRuns.createdAt))
    .limit(1);

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

      <h1 className="font-serif text-3xl text-ink-50 mb-1">Identity</h1>
      <p className="text-sm text-ink-300 mb-8">
        Who you&apos;re becoming, and what proves it.
      </p>

      {identityStatement && (
        <div className="card mb-10">
          <div className="card-glow" />
          <div className="text-xs uppercase tracking-[0.18em] text-accent-violet mb-2">
            Today&apos;s identity statement
          </div>
          <p className="font-serif text-2xl text-ink-50 leading-snug">
            {identityStatement}
          </p>
          <div className="text-[11px] text-ink-400 mt-3">
            From your{" "}
            <Link
              href="/morning"
              className="hover:text-ink-200 transition underline"
            >
              morning manifesto
            </Link>
            .
          </div>
        </div>
      )}

      <Section
        title="Confidence file"
        subtitle="Evidence of who you're becoming. Auto-grows from Daily Confidence runs."
      >
        {confidenceEntries.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-sm text-ink-300 mb-2">
              No entries yet.
            </p>
            <p className="text-xs text-ink-400">
              Run the Daily Confidence protocol to start collecting.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {confidenceEntries.map((e) => (
              <div key={e.id} className="card py-4">
                <div className="card-glow" />
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="font-serif text-base text-ink-100">
                    {e.title}
                  </div>
                  <div className="text-[11px] text-ink-400 shrink-0">
                    {format(new Date(e.createdAt), "MMM d")}
                  </div>
                </div>
                {e.body && (
                  <p className="text-sm text-ink-300 leading-relaxed">
                    {e.body}
                  </p>
                )}
                <div className="text-[10px] uppercase tracking-wider text-ink-500 mt-2">
                  {e.kind === "manual" ? "manual" : e.kind.replace("auto_", "")}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Protocols"
        subtitle="9 guided exercises for the inner work. Run any of them anytime."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PROTOCOLS.map((p) => (
            <Link
              key={p.slug}
              href={`/protocols/${p.slug}`}
              className="card hover:bg-white/[0.02] transition"
            >
              <div className="card-glow" />
              <div
                className={`text-xs uppercase tracking-[0.18em] mb-1 ${
                  ACCENT_TEXT[p.accent]
                }`}
              >
                {p.title}
              </div>
              <div className="font-serif text-base text-ink-100 mb-1 leading-snug">
                {p.subtitle}
              </div>
              <div className="text-[11px] text-ink-400">
                ~{p.estimatedMinutes} min · {p.prompts.length}{" "}
                {p.prompts.length === 1 ? "prompt" : "prompts"}
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {latestFutureLetter && (
        <Section
          title="Future letter"
          subtitle={`Last written ${format(
            new Date(latestFutureLetter.createdAt),
            "MMMM d, yyyy",
          )}`}
        >
          <Link
            href="/protocols/future_letter"
            className="card block hover:bg-white/[0.02] transition"
          >
            <div className="card-glow" />
            <p className="text-sm text-ink-300 mb-2">
              The version of you, five years from here.
            </p>
            <div className="text-accent-violet text-xs">
              Open future letter →
            </div>
          </Link>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xs uppercase tracking-[0.18em] text-ink-400">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-ink-300 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
