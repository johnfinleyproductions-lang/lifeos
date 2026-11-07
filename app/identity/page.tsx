import { Watermark } from "@/components/field/Watermark";
import Link from "next/link";
import { formatDay, formatInstant } from "@/lib/time/day";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  lifeosCompass,
  lifeosConfidenceEntries,
  lifeosProtocolRuns,
  lifeosDailyCheckins,
} from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { PROTOCOLS, getProtocol } from "@/lib/protocols/definitions";
import { morningManifestoSchema } from "@/lib/manifesto/schema";
import { PageStamp } from "@/components/PageStamp";
import { KEPT_PROTOCOL_SET } from "@/app/protocols/kept";

const KIND_LABEL: Record<string, string> = {
  manual: "added by hand",
  auto_protocol: "from a protocol run",
  auto_evening: "from the evening shutdown",
  auto_focus: "from a focus block",
  auto_build_log: "from the build log",
  auto_rating: "from a rating",
};

export default async function IdentityPage() {
  const { user } = await requireUserContext();

  // The evening win files itself; bring the file up to date first.

  const [latestCheckin, compassRows, confidenceEntries, runs] =
    await Promise.all([
      db
        .select()
        .from(lifeosDailyCheckins)
        .where(eq(lifeosDailyCheckins.userId, user.id))
        .orderBy(desc(lifeosDailyCheckins.entryDate))
        .limit(1)
        .then((r) => r[0]),
      db
        .select({ mission: lifeosCompass.mission })
        .from(lifeosCompass)
        .where(eq(lifeosCompass.userId, user.id))
        .limit(1),
      db
        .select()
        .from(lifeosConfidenceEntries)
        .where(eq(lifeosConfidenceEntries.userId, user.id))
        .orderBy(desc(lifeosConfidenceEntries.createdAt))
        .limit(10),
      db
        .select({
          id: lifeosProtocolRuns.id,
          slug: lifeosProtocolRuns.slug,
          runDate: lifeosProtocolRuns.runDate,
          payload: lifeosProtocolRuns.payload,
          durationSeconds: lifeosProtocolRuns.durationSeconds,
          createdAt: lifeosProtocolRuns.createdAt,
        })
        .from(lifeosProtocolRuns)
        .where(eq(lifeosProtocolRuns.userId, user.id))
        .orderBy(desc(lifeosProtocolRuns.createdAt))
        .limit(40),
    ]);

  const morningParse = latestCheckin?.morning
    ? morningManifestoSchema.safeParse(latestCheckin.morning)
    : null;
  const identityStatement =
    morningParse && morningParse.success ? morningParse.data.manifesto : null;
  const identityDate = latestCheckin?.entryDate ?? null;
  const mission = compassRows[0]?.mission?.trim() || null;

  const protocols = PROTOCOLS.filter((p) => KEPT_PROTOCOL_SET.has(p.slug));

  // Past runs: everything stored under a protocol slug, retired ones
  // included, since a run that happened is still a run. The weekly
  // review stores itself here too and is left out; it has its own page.
  const pastRuns = runs
    .map((r) => ({ ...r, protocol: getProtocol(r.slug) }))
    .filter((r) => r.protocol !== undefined)
    .slice(0, 12);

  const latestFutureLetter = runs.find((r) => r.slug === "future_letter");

  return (
    <div className="max-w-5xl mx-auto">
      <PageStamp
        title="Identity"
        subtitle="Who you're becoming, and what proves it."
      />

      {/* The two sentences in the user's own words, each one line. The
          manifesto used to print here at display size, a second hero
          for a sentence Today already prints; now it is a line, dated,
          with the compass's mission beside it. */}
      {(identityStatement || mission) && (
        <section className="mb-10 sheet sheet-hi sheet-cut shadow-mis-ink px-[26px] py-5">
          {mission && (
            <p className="flex items-baseline gap-3 m-0">
              <span className="lbl shrink-0 w-[84px]">Mission</span>
              <span className="font-serif italic text-[17px] leading-[1.45] min-w-0 flex-1">
                {mission}
              </span>
              <Link
                href="/compass"
                className="text-[12px] text-ink-300 underline decoration-ink-500 hover:decoration-accent-spot shrink-0"
              >
                Compass
              </Link>
            </p>
          )}
          {identityStatement && (
            <p
              className={`flex items-baseline gap-3 m-0 ${
                mission ? "mt-3 pt-3 border-t border-ink-600" : ""
              }`}
            >
              <span className="lbl shrink-0 w-[84px]">
                {identityDate ? formatDay(identityDate, "d MMM") : "Manifesto"}
              </span>
              <span className="font-serif italic text-[17px] leading-[1.45] min-w-0 flex-1">
                <span className="text-accent-spot not-italic">&ldquo;</span>
                {identityStatement}
                <span className="text-accent-spot not-italic">&rdquo;</span>
              </span>
              <Link
                href="/morning"
                className="text-[12px] text-ink-300 underline decoration-ink-500 hover:decoration-accent-spot shrink-0"
              >
                Revise
              </Link>
            </p>
          )}
        </section>
      )}

      <Section
        title="Confidence file"
        count={confidenceEntries.length}
        subtitle="Evidence of who you're becoming. Every evening's win files itself here; add anything else by hand."
      >
        {confidenceEntries.length === 0 ? (
          <div className="sheet sheet-bare sheet-cut text-center py-8 relative">
            <Watermark name="feather" size={140} />
            <p className="text-[14.5px] text-ink-300 m-0">No entries yet.</p>
            <p className="text-[12.5px] text-ink-400 mt-1 mb-0">
              The first evening shutdown starts the file.
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
                    {e.body && e.kind === "auto_evening" ? e.body : e.title}
                  </div>
                  <div className="text-[11.5px] text-ink-400 shrink-0 tabular-nums">
                    {formatInstant(new Date(e.createdAt), "d MMM")}
                  </div>
                </div>
                {e.body && e.kind !== "auto_evening" && (
                  <p className="font-serif text-[15px] text-ink-300 leading-[1.5] mt-1 mb-0">
                    {e.body}
                  </p>
                )}
                <div className="lbl mt-2">
                  {KIND_LABEL[e.kind] ?? e.kind.replace("auto_", "from ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Protocols"
        count={protocols.length}
        subtitle="Guided exercises for the inner work. Run any of them any time."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {protocols.map((p) => (
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

      <Section
        title="Past runs"
        count={pastRuns.length}
        subtitle="Every protocol run is kept. Open one to read what you wrote."
      >
        {pastRuns.length === 0 ? (
          <div className="sheet sheet-bare sheet-cut text-center py-8 relative">
            <Watermark name="keys" size={140} />
            <p className="text-[14.5px] text-ink-300 m-0">
              Nothing run yet. The first one is listed here when it is saved.
            </p>
          </div>
        ) : (
          <div className="sheet py-1">
            {pastRuns.map((r) => {
              const payload = (r.payload ?? {}) as Record<string, unknown>;
              const promptIds = new Set(r.protocol!.prompts.map((p) => p.id));
              const answers = r.protocol!.prompts
                .map((p) => ({
                  label: p.label,
                  value:
                    typeof payload[p.id] === "string"
                      ? (payload[p.id] as string).trim()
                      : "",
                }))
                // an older run can carry keys the prompt set no longer
                // has; print them under their key rather than lose them
                .concat(
                  Object.entries(payload)
                    .filter(
                      ([k, v]) =>
                        !promptIds.has(k) && typeof v === "string" && v.trim(),
                    )
                    .map(([k, v]) => ({ label: k, value: (v as string).trim() })),
                )
                .filter((a) => a.value.length > 0);
              const first = answers[0]?.value ?? "";
              return (
                <details
                  key={r.id}
                  className="group py-3 border-b border-ink-600 last:border-b-0"
                >
                  <summary className="flex items-baseline gap-3 cursor-pointer list-none">
                    <span
                      className="text-[15px] shrink-0"
                      style={{ fontVariationSettings: "'wght' 680" }}
                    >
                      {r.protocol!.title}
                    </span>
                    <span className="font-serif text-[15px] text-ink-300 truncate flex-1 min-w-0 group-open:hidden">
                      {first}
                    </span>
                    <span className="text-[11.5px] text-ink-400 shrink-0 tabular-nums ml-auto">
                      {formatDay(r.runDate, "d MMM yyyy")}
                      {r.durationSeconds
                        ? `, ${Math.max(1, Math.round(r.durationSeconds / 60))} min`
                        : ""}
                    </span>
                  </summary>
                  <div className="mt-3 pl-0 md:pl-4 space-y-3">
                    {answers.map((a) => (
                      <div key={a.label}>
                        <div className="lbl mb-1">{a.label}</div>
                        <div className="font-serif text-[16px] leading-[1.5] whitespace-pre-wrap">
                          {a.value}
                        </div>
                      </div>
                    ))}
                    {answers.length === 0 && (
                      <p className="text-[13px] text-ink-400 m-0">
                        This run saved with no answers.
                      </p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Section>

      {latestFutureLetter && (
        <Section
          title="Future letter"
          subtitle={`Last written ${formatInstant(
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
            <span className="btn btn-sm btn-ghost shrink-0">Write again</span>
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
