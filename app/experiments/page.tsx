import { requireUserContext } from "@/lib/auth/server-helpers";
import { experimentsOn } from "@/lib/experiments/enabled";
import { loadExperiments } from "@/lib/experiments/load";
import { PageStamp } from "@/components/PageStamp";
import { ExperimentsClient } from "@/components/experiments/ExperimentsClient";
import { ShelfRow } from "@/components/experiments/ShelfRow";
import { TurnExperimentsOn } from "@/components/settings/ExperimentsToggle";

export const metadata = { title: "Experiments · LifeOS" };

/**
 * Experiments: try something small for a set time, then decide.
 *
 * The page follows the loop in Anne-Laure Le Cunff's Tiny Experiments.
 * Start from a curiosity. Commit to an action, not an outcome, for a fixed
 * length. Note how each day went, including the days it did not happen.
 * When the time is up, look at what worked, what did not and what next,
 * and choose: keep going, pause, or change it.
 *
 * What the page leaves out is on purpose. No percentage, no streak, no
 * running verdict: the judging waits for the last day.
 */
export default async function ExperimentsPage() {
  const { user } = await requireUserContext();
  const on = await experimentsOn();

  if (!on) {
    return (
      <div className="max-w-2xl mx-auto">
        <PageStamp title="Experiments" subtitle="Try it small, for a set time, then decide." />
        <div className="sheet">
          <div className="t-h2 mb-2">This section is switched off.</div>
          <p className="text-[14.5px] text-ink-300 mt-0 mb-4 max-w-[56ch]">
            An experiment is one sentence, I will do this for that long, and a line a day on how it
            went. When the time is up you decide whether to keep going, pause, or change it. It is
            optional, and you can switch it off again in Settings.
          </p>
          <TurnExperimentsOn />
        </div>
      </div>
    );
  }

  const { live, shelf } = await loadExperiments(user.id);

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp title="Experiments" subtitle="Try it small, for a set time, then decide." />

      {live.length === 0 && shelf.length === 0 && (
        <div className="sheet sheet-bare mb-5">
          <p className="t-read m-0 max-w-[58ch]">
            Start from something you have wondered about. Turn it into one thing you can do, and a
            length of time you can see the end of. Then do it and write down what you notice. A day
            it does not happen goes in the record like any other.
          </p>
        </div>
      )}

      <ExperimentsClient live={live} />

      {shelf.length > 0 && (
        <section className="mt-8">
          <div className="tab-row">
            <span className="tab">The shelf</span>
            <span className="fill" />
          </div>
          <div className="sheet">
            <ul className="m-0 p-0 list-none" id="shelf">
              {shelf.map((exp) => (
                <ShelfRow key={exp.id} exp={exp} />
              ))}
            </ul>
          </div>
        </section>
      )}

      <p className="lbl mt-6 max-w-[64ch]">
        The shape of this page comes from Anne-Laure Le Cunff&apos;s book Tiny Experiments.
      </p>
    </div>
  );
}
