import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Watermark } from "@/components/field/Watermark";
import { formatDay } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosProtocolRuns } from "@/lib/db/schema/lifeos";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { BALANCE_DIMENSIONS } from "@/lib/reflection/balance";
import {
  setReadings,
  weeklyReviewInputSchema,
  type WeeklyReviewInput,
} from "@/lib/reflection/weekly-review-schema";
import { PageStamp } from "@/components/PageStamp";

/**
 * Every weekly review, newest first, printed as dated sheets.
 *
 * The review asks for a reflection, the wins, a lesson and three
 * priorities for the coming week, and until now only the balance
 * readings were ever read back. This is where the rest of it goes to be
 * read again.
 */
export default async function PastReviewsPage() {
  const { user } = await requireUserContext();

  const runs = await db
    .select({
      id: lifeosProtocolRuns.id,
      runDate: lifeosProtocolRuns.runDate,
      createdAt: lifeosProtocolRuns.createdAt,
      payload: lifeosProtocolRuns.payload,
    })
    .from(lifeosProtocolRuns)
    .where(
      and(
        eq(lifeosProtocolRuns.userId, user.id),
        eq(lifeosProtocolRuns.slug, "weekly_review"),
      ),
    )
    .orderBy(desc(lifeosProtocolRuns.runDate), desc(lifeosProtocolRuns.createdAt))
    .limit(104);

  const reviews = runs.flatMap((r) => {
    const parsed = weeklyReviewInputSchema.safeParse(r.payload);
    return parsed.success
      ? [{ id: r.id, runDate: r.runDate, payload: parsed.data }]
      : [];
  });

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp
        title="Past reviews"
        subtitle={`${reviews.length} ${reviews.length === 1 ? "week" : "weeks"} on record.`}
        backHref="/weekly-review"
        backLabel="This week's review"
      />

      {reviews.length === 0 ? (
        <div className="sheet sheet-bare sheet-cut text-center py-10 relative">
          <Watermark name="shell" />
          <div className="t-h2 mb-2">No weeks reviewed yet.</div>
          <p className="text-[14.5px] text-ink-300 mb-5 max-w-[40ch] mx-auto">
            The first review starts the record. Twenty minutes, once a week.
          </p>
          <Link href="/weekly-review" className="btn">
            Review this week
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {reviews.map((r) => (
            <ReviewSheet key={r.id} runDate={r.runDate} payload={r.payload} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewSheet({
  runDate,
  payload,
}: {
  runDate: string;
  payload: WeeklyReviewInput;
}) {
  const readings = setReadings(payload.balance);
  const wins = payload.wins
    .split("\n")
    .map((w) => w.trim())
    .filter(Boolean);

  return (
    <section>
      <div className="tab-row">
        <span className="tab">{formatDay(runDate, "EEEE, d MMMM yyyy")}</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400 tabular-nums">
          {readings.length === 0
            ? "no readings"
            : `${readings.length} of 6 readings`}
        </span>
      </div>
      <article className="sheet space-y-5">
        {payload.reflect.trim() && (
          <Field label="The week">
            <div className="t-read whitespace-pre-wrap">{payload.reflect}</div>
          </Field>
        )}

        {wins.length > 0 && (
          <Field label="Wins">
            <ul className="m-0 p-0 list-none space-y-1">
              {wins.map((w, i) => (
                <li key={i} className="t-read flex gap-2.5">
                  <span className="text-accent-spot shrink-0" aria-hidden="true">
                    &mdash;
                  </span>
                  <span className="min-w-0">{w}</span>
                </li>
              ))}
            </ul>
          </Field>
        )}

        {payload.lesson.trim() && (
          <Field label="Carrying forward">
            <div className="t-read whitespace-pre-wrap">{payload.lesson}</div>
            {payload.reframe && (
              <div className="t-read text-ink-300 whitespace-pre-wrap mt-2 italic">
                {payload.reframe}
              </div>
            )}
          </Field>
        )}

        {(payload.nextWeekFeel.trim() || payload.nextWeekPriorities.length > 0) && (
          <Field label="Planted for the week after">
            {payload.nextWeekFeel.trim() && (
              <div className="text-[13.5px] text-ink-300 mb-2">
                It should feel: <span className="font-serif text-ink-100 text-[16px]">{payload.nextWeekFeel}</span>
              </div>
            )}
            {payload.nextWeekPriorities.length > 0 && (
              <ol className="m-0 p-0 list-none space-y-1.5">
                {payload.nextWeekPriorities.map((p, i) => (
                  <li key={i} className="flex items-baseline gap-2.5">
                    <span
                      className="w-[22px] shrink-0 tabular-nums text-[13px] text-ink-400"
                      style={{ fontVariationSettings: "'wdth' 80, 'wght' 800" }}
                    >
                      {i + 1}
                    </span>
                    <span className="t-read min-w-0">{p}</span>
                  </li>
                ))}
              </ol>
            )}
          </Field>
        )}

        {readings.length > 0 && (
          <Field label="Balance">
            <div className="flex flex-col gap-1.5">
              {readings.map(({ key, value }) => {
                const d = BALANCE_DIMENSIONS.find((x) => x.key === key);
                if (!d) return null;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-[12px] text-ink-300">
                      {d.label}
                    </span>
                    <span className="plot flex-1">
                      <span
                        className={d.accentClass}
                        style={{ width: `${(value / 10) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 text-right text-[11.5px] text-ink-400 tabular-nums">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </Field>
        )}
      </article>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="lbl mb-1.5">{label}</div>
      {children}
    </div>
  );
}
