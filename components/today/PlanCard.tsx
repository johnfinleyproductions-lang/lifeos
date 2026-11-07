import Link from "next/link";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { getTodayCheckin } from "@/lib/checkin/today";
import { getTodayStrikes } from "./strikes";
import { PriorityList } from "./PriorityList";

/**
 * The three.
 *
 * While the day is open they lead the page at full size with working
 * boxes: a strike here is written straight away (see actions.ts) and
 * survives a reload, so the evening wizard is no longer the only place
 * one can be struck. Once the shutdown is logged the same rows print
 * compact and read-only under the closed-day card, since the record
 * for the day is the evening's and there is nothing left to do.
 */
export async function PlanCard({
  variant = "lead",
}: {
  variant?: "lead" | "closed";
}) {
  const { user } = await getAuthContext();
  const [{ morning, evening }, strikes] = user
    ? await Promise.all([getTodayCheckin(user.id), getTodayStrikes(user.id)])
    : [{ morning: null, evening: null }, { done: [] as boolean[] }];

  if (!morning) {
    return (
      <section>
        <div className="tab-row">
          <span className="tab">The three</span>
          <span className="fill" />
        </div>
        <div className="sheet sheet-bare sheet-cut text-center py-7">
          <p className="t-read text-ink-300 m-0 mx-auto max-w-[34ch]">
            Set at the morning manifesto. Two is allowed; three is the most
            that has ever actually landed.
          </p>
        </div>
      </section>
    );
  }

  const done = strikes.done;
  const doneCount = morning.priorities.filter((_, i) => done[i]).length;
  const total = morning.priorities.length;
  const closed = variant === "closed";

  return (
    <section>
      <div className="tab-row">
        <span className="tab">The three</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400 tabular-nums">
          {doneCount === 0 && !closed
            ? `${total} set`
            : `${doneCount} of ${total} struck`}
        </span>
      </div>

      <PriorityList
        key={`${closed}-${done.join("")}`}
        priorities={morning.priorities}
        done={done}
        readOnly={closed}
        size={closed ? "compact" : "full"}
      />

      {!closed && (morning.protect || morning.gratitude) && (
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

      {!closed && !evening && (
        <p className="text-[11.5px] text-ink-400 mt-3 flex items-center gap-3 flex-wrap">
          <span>A strike here is kept for the day.</span>
          <Link href="/morning" className="underline decoration-ink-500 hover:decoration-accent-spot">
            Revise the three
          </Link>
        </p>
      )}
    </section>
  );
}
