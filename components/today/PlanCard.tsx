import { getAuthContext } from "@/lib/auth/server-helpers";
import { getTodayCheckin } from "@/lib/checkin/today";

/**
 * The three, as ledger rows rather than a card of bullets.
 *
 * Check-offs still land at evening shutdown; this is a read-only view of
 * what was set and what came back done. Making the boxes strikeable here
 * needs a write route, which is a behaviour change rather than a restyle.
 */
export async function PlanCard() {
  const { user } = await getAuthContext();
  const { morning, evening } = user
    ? await getTodayCheckin(user.id)
    : { morning: null, evening: null };

  if (!morning) {
    return (
      <section>
        <div className="tab-row">
          <span className="tab">The three</span>
          <span className="fill" />
        </div>
        <div className="sheet sheet-bare border-dashed text-center py-7">
          <p className="t-read text-ink-300 m-0 mx-auto max-w-[34ch]">
            Set at the morning manifesto. Two is allowed; three is the most
            that has ever actually landed.
          </p>
        </div>
      </section>
    );
  }

  const doneFlags = evening?.prioritiesDone ?? [];
  const doneCount = doneFlags.filter(Boolean).length;
  const total = morning.priorities.length;

  return (
    <section>
      <div className="tab-row">
        <span className="tab">The three</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400 tabular-nums">
          {evening ? `${doneCount} of ${total}` : `${total} set`}
        </span>
      </div>

      <div className="border-t-[1.5px] border-ink-50">
        {morning.priorities.map((p, i) => {
          const done = doneFlags[i] ?? false;
          return (
            <div
              key={i}
              className="flex items-center gap-3 py-3 px-0.5 border-b border-ink-600 last:border-b-[1.5px] last:border-b-ink-50"
            >
              <span
                className="w-[26px] shrink-0 tabular-nums text-[15px] text-ink-400"
                style={{ fontVariationSettings: "'wdth' 80, 'wght' 800" }}
              >
                {i + 1}
              </span>
              <span
                aria-hidden="true"
                className={`w-[22px] h-[22px] shrink-0 border-[1.5px] relative ${
                  done
                    ? "bg-accent-spot border-accent-spot"
                    : "border-ink-50 bg-ink-700"
                }`}
              >
                {done && (
                  <span className="absolute left-[5px] top-[9px] w-[9px] h-[4px] border-white border-b-[2.5px] border-l-[2.5px] rotate-[-45deg]" />
                )}
              </span>
              <span
                className={`flex-1 min-w-0 text-[15.5px] leading-[1.35] ${
                  done
                    ? "text-ink-400 line-through decoration-accent-spot decoration-2"
                    : ""
                }`}
                style={{ fontVariationSettings: "'wght' 540" }}
              >
                {p}
              </span>
            </div>
          );
        })}
      </div>

      {(morning.protect || morning.gratitude) && (
        <div className="sheet sheet-bare mt-3.5 py-1 px-3.5">
          {morning.protect && (
            <div className="flex gap-3.5 py-2.5 border-b border-ink-600 last:border-b-0">
              <span
                className="shrink-0 w-[84px] text-[11.5px] text-ink-400 pt-[3px]"
                style={{ fontVariationSettings: "'wdth' 100, 'wght' 680" }}
              >
                Protecting
              </span>
              <span className="flex-1 font-serif text-base leading-[1.5]">
                {morning.protect}
              </span>
            </div>
          )}
          {morning.gratitude && (
            <div className="flex gap-3.5 py-2.5">
              <span
                className="shrink-0 w-[84px] text-[11.5px] text-ink-400 pt-[3px]"
                style={{ fontVariationSettings: "'wdth' 100, 'wght' 680" }}
              >
                Thankful for
              </span>
              <span className="flex-1 font-serif text-base leading-[1.5]">
                {morning.gratitude}
              </span>
            </div>
          )}
        </div>
      )}

      {!evening && (
        <p className="text-[11px] text-ink-400 mt-3">
          Check-offs land at evening shutdown.
        </p>
      )}
    </section>
  );
}
