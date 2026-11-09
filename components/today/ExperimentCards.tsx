import { getAuthContext } from "@/lib/auth/server-helpers";
import { experimentsOn } from "@/lib/experiments/enabled";
import { loadLiveExperiments } from "@/lib/experiments/load";
import { RunningCard } from "@/components/experiments/RunningCard";

/**
 * Experiments in play, as compact cards with today's mark. Used on Today
 * and above the evening page.
 *
 * Prints nothing, and reads nothing, unless the section is switched on in
 * Settings. `unmarkedOnly` is for the evening page: it shows only what
 * still needs today's mark or is waiting to be closed.
 */
export async function ExperimentCards({ unmarkedOnly = false }: { unmarkedOnly?: boolean }) {
  if (!(await experimentsOn())) return null;
  const { user } = await getAuthContext();
  if (!user) return null;

  const live = await loadLiveExperiments(user.id);
  const shown = unmarkedOnly
    ? live.filter((e) => e.phase === "ready" || (e.today && !e.today.marked))
    : live;
  if (shown.length === 0) return null;

  return (
    <div className="flex flex-col gap-3.5" id="experiments-today">
      {shown.map((exp) => (
        <RunningCard key={exp.id} exp={exp} compact />
      ))}
    </div>
  );
}
