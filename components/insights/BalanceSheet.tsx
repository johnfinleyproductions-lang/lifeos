import Link from "next/link";
import type { BalanceScore } from "@/lib/reflection/balance";
import { BALANCE_DIMENSIONS } from "@/lib/reflection/balance";
import { Watermark } from "@/components/field/Watermark";

/**
 * The six balance readings from the most recent weekly review, as
 * plotted bars. Came over from the Discipline page when it folded into
 * Insights; the Today card prints the same six smaller.
 */
export function BalanceSheet({ balance }: { balance: BalanceScore | null }) {
  return (
    <section>
      <div className="tab-row">
        <span className="tab">Balance</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400">
          {balance ? "most recent review" : "no review yet"}
        </span>
      </div>
      <div className={balance ? "sheet" : "sheet relative"}>
        {!balance && <Watermark name="shell" size={120} />}
        {balance ? (
          <div className="flex flex-col gap-2">
            {BALANCE_DIMENSIONS.map((d) => (
              <div key={d.key} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-[13px] text-ink-300">
                  {d.label}
                </span>
                <span className="plot flex-1">
                  <span
                    className={d.accentClass}
                    style={{ width: `${(balance[d.key] / 10) * 100}%` }}
                  />
                </span>
                <span className="w-8 text-right text-[12.5px] text-ink-400 tabular-nums">
                  {balance[d.key]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-[14.5px] text-ink-300 m-0">
              Six readings, taken once a week. The first weekly review starts
              the series.
            </p>
            <Link href="/weekly-review" className="btn btn-sm btn-ghost">
              Write the first review
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
