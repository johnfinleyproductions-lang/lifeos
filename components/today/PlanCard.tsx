import { getAuthContext } from "@/lib/auth/server-helpers";
import { getTodayCheckin } from "@/lib/checkin/today";

export async function PlanCard() {
  const { user } = await getAuthContext();
  const { morning, evening } = user
    ? await getTodayCheckin(user.id)
    : { morning: null, evening: null };

  if (!morning) {
    return (
      <div className="card">
        <div className="card-glow" />
        <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
          Today&apos;s plan
        </div>
        <div className="font-serif text-lg text-ink-100 mb-3">
          Set after morning manifesto
        </div>
        <div className="space-y-2 text-sm text-ink-400">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded border border-ink-500 mt-0.5 shrink-0" />
            <span>Priority one will appear here</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded border border-ink-500 mt-0.5 shrink-0" />
            <span>Priority two will appear here</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded border border-ink-500 mt-0.5 shrink-0" />
            <span>Priority three will appear here</span>
          </div>
        </div>
      </div>
    );
  }

  const doneFlags = evening?.prioritiesDone ?? [];
  const doneCount = doneFlags.filter(Boolean).length;
  const hasEvening = evening !== null;
  const total = morning.priorities.length;

  return (
    <div className="card">
      <div className="card-glow" />
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
        Today&apos;s plan
      </div>
      <div className="font-serif text-lg text-ink-100 mb-3">
        {hasEvening
          ? `${doneCount} of ${total} done`
          : total === 1
            ? "1 priority"
            : `${total} priorities`}
      </div>
      <div className="space-y-2 text-sm">
        {morning.priorities.map((p, i) => {
          const done = doneFlags[i] ?? false;
          return (
            <div
              key={i}
              className={`flex items-start gap-2 transition ${
                done ? "opacity-60" : ""
              }`}
            >
              <span
                className={`w-4 h-4 rounded mt-0.5 shrink-0 grid place-items-center text-[10px] ${
                  done
                    ? "bg-accent-green border border-accent-green text-ink-950"
                    : "border border-ink-500"
                }`}
              >
                {done ? "✓" : ""}
              </span>
              <span
                className={
                  done
                    ? "text-ink-300 line-through"
                    : "text-ink-100"
                }
              >
                {p}
              </span>
            </div>
          );
        })}
      </div>
      {!hasEvening && (
        <div className="mt-4 text-[11px] text-ink-400">
          Check-offs land at evening shutdown.
        </div>
      )}
    </div>
  );
}
