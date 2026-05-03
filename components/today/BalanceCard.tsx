import { getAuthContext } from "@/lib/auth/server-helpers";
import { getLatestBalance } from "@/lib/reflection/auto-detect";
import { BALANCE_DIMENSIONS } from "@/lib/reflection/balance";

/**
 * Reads the most recent weekly review's balance scores.
 * Empty state when none yet — points the user to the weekly review.
 */
export async function BalanceCard() {
  const { user } = await getAuthContext();
  const balance = user ? await getLatestBalance(user.id) : null;

  return (
    <div className="card">
      <div className="card-glow" />
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
        Balance score · last review
      </div>
      <div className="font-serif text-lg text-ink-100 mb-3">
        {balance ? "Most recent week" : "Begins after first weekly review"}
      </div>
      <div className="space-y-1.5">
        {BALANCE_DIMENSIONS.map((d) => {
          const score = balance ? balance[d.key] : 0;
          return (
            <div key={d.key} className="flex items-center gap-3">
              <div className="w-20 text-xs text-ink-300">{d.label}</div>
              <div className="flex-1 h-1.5 bg-ink-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${d.accentClass} rounded-full ${
                    balance ? "" : "opacity-30"
                  }`}
                  style={{ width: `${(score / 10) * 100}%` }}
                />
              </div>
              <div className="w-7 text-right text-[11px] text-ink-400 tabular-nums">
                {score}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
