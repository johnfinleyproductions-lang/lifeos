import { Watermark } from "@/components/field/Watermark";
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
import { PROTOCOLS } from "@/lib/protocols/definitions";
import { morningManifestoSchema } from "@/lib/manifesto/schema";
import { PageStamp } from "@/components/PageStamp";

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
      <PageStamp
        title="Identity"
        subtitle="Who you're becoming, and what proves it."
      />

      {identityStatement && (
        <section className="mb-10">
          <div className="tab-row">
            <span className="tab tab-spot">
              Today&apos;s identity statement
            </span>
            <span className="fill" />
            <Link href="/morning" className="btn btn-sm btn-ghost">
              Revise
            </Link>
          </div>
          <div className="sheet sheet-hi sheet-cut shadow-mis px-[26px] py-6">
            <p className="font-serif text-[clamp(21px,2.6vw,30px)] leading-[1.22] tracking-[-0.01em] m-0 max-w-[32ch] text-balance">
              <span className="text-accent-spot">&ldquo;</span>
              {identityStatement}
              <span className="text-accent-spot">&rdquo;</span>
            </p>
            <p className="text-[11.5px] text-ink-400 mt-4 mb-0">
              From this morning&apos;s manifesto.
            </p>
          </div>
        </section>
      )}

      <Section
        title="Confidence file"
        count={confidenceEntries.length}
        subtitle="Evidence of who you're becoming. Grows on its own from Daily Confidence runs."
      >
        {confidenceEntries.length === 0 ? (
          <div className="sheet sheet-bare sheet-cut text-center py-8 relative">
            <Watermark name="feather" size={140} />
            <p className="text-[14.5px] text-ink-300 m-0">No entries yet.</p>
            <p className="text-[12.5px] text-ink-400 mt-1 mb-0">
              Run the Daily Confidence protocol to start collecting.
            </p>
          </div>
        ) : (
          <div className="sheet py-1">
            {confidenceEntries.map((e) => (
              <div
                key={e.id}
                className="py-3.5 border-b border-ink-600 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-serif text-[17px] leading-[1.35]">
                    {e.title}
                  </div>
                  <div className="text-[11.5px] text-ink-400 shrink-0 tabular-nums">
                    {format(new Date(e.createdAt), "d MMM")}
                  </div>
                </div>
                {e.body && (
                  <p className="font-serif text-[15px] text-ink-300 leading-[1.5] mt-1 mb-0">
                    {e.body}
                  </p>
                )}
                <div className="lbl mt-2">
                  {e.kind === "manual"
                    ? "added by hand"
                    : e.kind.replace("auto_", "from ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Protocols"
        count={PROTOCOLS.length}
        subtitle="Guided exercises for the inner work. Run any of them any time."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PROTOCOLS.map((p) => (
            <Link
              key={p.slug}
              href={`/protocols/${p.slug}`}
              className="sheet hover:bg-ink-700 hover:shadow-mis-ink flex flex-col"
            >
              <div
                className="text-[16px] leading-tight"
                style={{ fontVariationSettings: "'wdth' 100, 'wght' 700" }}
              >
                {p.title}
              </div>
              <div className="text-[13.5px] text-ink-300 mt-1.5 leading-[1.4] flex-1">
                {p.subtitle}
              </div>
              <div className="lbl mt-3">
                About {p.estimatedMinutes} min, {p.prompts.length}{" "}
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
            "d MMMM yyyy",
          )}.`}
        >
          <Link
            href="/protocols/future_letter"
            className="sheet flex items-center justify-between gap-4 hover:bg-ink-700"
          >
            <span className="text-[14.5px] text-ink-300">
              The version of you, five years from here.
            </span>
            <span className="btn btn-sm btn-ghost shrink-0">Open</span>
          </Link>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="tab-row">
        <span className="tab">{title}</span>
        <span className="fill" />
        {count !== undefined && (
          <span className="text-[11.5px] text-ink-400 tabular-nums">
            {count}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[13.5px] text-ink-300 -mt-1.5 mb-3.5 max-w-[62ch]">
          {subtitle}
        </p>
      )}
      {children}
    </section>
  );
}
