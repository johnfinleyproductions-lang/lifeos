import Link from "next/link";
import { getAuthContext } from "@/lib/auth/server-helpers";
import { getLatestBalance } from "@/lib/reflection/auto-detect";
import { BALANCE_DIMENSIONS } from "@/lib/reflection/balance";

/**
 * The most recent weekly review's balance scores. Empty until the first
 * review exists, so the empty state sends you to write one rather than
 * showing six bars pinned at zero.
 */
export async function BalanceCard() {
  const { user } = await getAuthContext();
  const balance = user ? await getLatestBalance(user.id) : null;

  return (
    <div className="sheet">
      <div className="tab-row">
        <span className="tab">Balance</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400">
          {balance ? "Last review" : "Not yet"}
        </span>
      </div>

      {!balance ? (
        <>
          <p className="t-read text-ink-300 m-0 mb-3.5">
            Six readings, taken once a week. The first weekly review starts
            the series.
          </p>
          <Link href="/weekly-review" className="btn btn-sm btn-ghost w-full">
            Write the first review
          </Link>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {BALANCE_DIMENSIONS.map((d) => {
            const score = balance[d.key];
            return (
              <div key={d.key} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-ink-300">
                  {d.label}
                </span>
                <span className="plot flex-1">
                  <span
                    className={d.accentClass}
                    style={{ width: `${(score / 10) * 100}%` }}
                  />
                </span>
                <span className="w-6 text-right text-[11.5px] text-ink-400 tabular-nums">
                  {score}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
