import Link from "next/link";
import { and, count, eq, gte, isNotNull } from "drizzle-orm";
import { formatDay, todayKey } from "@/lib/time/day";
import { db } from "@/lib/db";
import { lifeosDailyCheckins } from "@/lib/db/schema/lifeos";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { getTodayCheckin } from "@/lib/checkin/today";
import { fieldMarksShown } from "@/lib/collection/field-marks";
import { ordinal } from "@/lib/collection/ordinal";
import { Stamp } from "@/components/field/Stamp";

const RATING_LABELS: Record<number, string> = {
  1: "off",
  2: "rough",
  3: "okay",
  4: "good",
  5: "alive",
};

/**
 * Renders only when today's evening shutdown has been completed. Returns
 * null otherwise so the page layout collapses naturally.
 *
 * Once the day is closed this card leads the page. The sheet takes a
 * date stamp, the way a logbook page does when the entry is done, and
 * the stamp carries a running count: which closed day of the year this
 * is. The count only ever goes up. A day that was not closed is not
 * counted and not mentioned.
 *
 * The seed for tomorrow is not in the card. It prints as its own quiet
 * line under the three (see TomorrowSeed), because it is the one thing
 * on a closed day that points forward.
 */
export async function EveningSummaryCard() {
  const { user } = await getAuthContext();
  if (!user) return null;
  const { evening, morning } = await getTodayCheckin(user.id);
  if (!evening) return null;

  const marks = await fieldMarksShown();
  // The household's today, not the process zone's. The stamp is a dated
  // artifact and a UTC container would print tomorrow's date on it all
  // evening; the year window below would be wrong on New Year's Eve too.
  const today = todayKey();

  let closedThisYear = 0;
  if (marks) {
    const [row] = await db
      .select({ value: count() })
      .from(lifeosDailyCheckins)
      .where(
        and(
          eq(lifeosDailyCheckins.userId, user.id),
          isNotNull(lifeosDailyCheckins.evening),
          gte(lifeosDailyCheckins.entryDate, `${today.slice(0, 4)}-01-01`),
        ),
      );
    closedThisYear = Number(row?.value ?? 0);
  }

  return (
    <section>
      <div className="tab-row">
        <span className="tab">Day closed</span>
        <span className="fill" />
        <Link href="/evening" className="btn btn-sm btn-ghost">
          Edit
        </Link>
      </div>

      <div className="sheet">
        <div className="flex items-center gap-x-4 gap-y-3 flex-wrap mb-5">
          <span className="stat-v mt-0">
            {evening.dayRating}
            <small>/5</small>
          </span>
          <span
            className="text-[15px]"
            style={{ fontVariationSettings: "'wght' 620" }}
          >
            {RATING_LABELS[evening.dayRating]}, {evening.dayMood}
          </span>
          {marks && (
            <span className="ml-auto flex items-center gap-3.5 pr-1">
              <span className="text-[11.5px] text-ink-400 text-right leading-[1.35] max-w-[16ch]">
                {closedThisYear > 0
                  ? `The ${ordinal(closedThisYear)} day closed this year${
                      morning ? ", a full one" : ""
                    }.`
                  : ""}
              </span>
              <Stamp
                title="Day closed"
                line={formatDay(today, "d MMM yyyy")}
              />
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummaryField label="Win" body={evening.win} />
          {/* A Quick evening does not ask for a lesson; a label over
              nothing is worse than no label. */}
          {evening.lesson ? (
            <SummaryField label="Carrying forward" body={evening.lesson} />
          ) : null}
        </div>

        {(evening.reframe || evening.release) && (
          <div className="mt-5 pt-5 border-t-[1.5px] border-ink-500 grid grid-cols-1 md:grid-cols-2 gap-4">
            {evening.reframe && (
              <SummaryField label="Reframe" body={evening.reframe} />
            )}
            {evening.release && (
              <SummaryField label="Released" body={evening.release} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * One ink line that points forward. The only part of a closed day that
 * is about tomorrow, so it sits last and on its own.
 */
export async function TomorrowSeed() {
  const { user } = await getAuthContext();
  if (!user) return null;
  const { evening } = await getTodayCheckin(user.id);
  // A Quick evening may not have planted one, and a label pointing at an
  // empty line is not a quiet line forward.
  if (!evening || !evening.tomorrowSeed) return null;
  return (
    <p className="flex items-baseline gap-3 m-0 pt-4 border-t-[1.5px] border-ink-50">
      <span className="lbl shrink-0">Tomorrow&apos;s seed</span>
      <span className="font-serif text-[17px] leading-[1.45]">
        {evening.tomorrowSeed}
      </span>
    </p>
  );
}

/** The user's own words, so these sit in the serif. */
function SummaryField({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="lbl mb-1">{label}</div>
      <div className="font-serif text-base leading-[1.5]">{body}</div>
    </div>
  );
}
