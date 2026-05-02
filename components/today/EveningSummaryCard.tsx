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
    <div className="card">
      <div className="card-glow" />
      <div className="flex items-start justify-between gap-6 mb-5">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
            Day closed
          </div>
          <p className="font-serif text-2xl text-ink-50 leading-snug">
            {evening.dayRating}/5 · {evening.dayMood}
            <span className="text-ink-400 text-base ml-2">
              ({RATING_LABELS[evening.dayRating]})
            </span>
          </p>
        </div>
        <Link
          href="/evening"
          className="shrink-0 text-xs text-ink-400 hover:text-ink-100 transition"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <SummaryField
          color="text-accent-green"
          label="Win"
          body={evening.win}
        />
        <SummaryField
          color="text-accent-sky"
          label="Carrying forward"
          body={evening.lesson}
        />
        <SummaryField
          color="text-accent-gold"
          label="Tomorrow's seed"
          body={evening.tomorrowSeed}
        />
      </div>

      {(evening.reframe || evening.release) && (
        <div className="mt-5 pt-5 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {evening.reframe && (
            <SummaryField
              color="text-accent-violet"
              label="Reframe"
              body={evening.reframe}
            />
          )}
          {evening.release && (
            <SummaryField
              color="text-accent-rose"
              label="Released"
              body={evening.release}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SummaryField({
  color,
  label,
  body,
}: {
  color: string;
  label: string;
  body: string;
}) {
  return (
    <div>
      <div
        className={`text-[10px] uppercase tracking-[0.16em] mb-1 ${color}`}
      >
        {label}
      </div>
      <div className="text-ink-100 leading-snug">{body}</div>
    </div>
  );
}
