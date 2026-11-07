import Link from "next/link";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { getTodayCheckin } from "@/lib/checkin/today";

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
 */
export async function EveningSummaryCard() {
  const { user } = await getAuthContext();
  if (!user) return null;
  const { evening } = await getTodayCheckin(user.id);
  if (!evening) return null;

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
        <div className="flex items-baseline gap-3 flex-wrap mb-5">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryField label="Win" body={evening.win} />
          <SummaryField label="Carrying forward" body={evening.lesson} />
          <SummaryField label="Tomorrow's seed" body={evening.tomorrowSeed} />
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

/** The user's own words, so these sit in the serif. */
function SummaryField({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="lbl mb-1">{label}</div>
      <div className="font-serif text-base leading-[1.5]">{body}</div>
    </div>
  );
}
