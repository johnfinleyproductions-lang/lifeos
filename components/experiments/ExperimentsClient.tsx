"use client";

import { useState } from "react";
import type { ExperimentView } from "@/lib/experiments/load";
import { MAX_RUNNING } from "@/lib/experiments/rules";
import { CloseForm } from "./CloseForm";
import { RunningCard } from "./RunningCard";
import { StartForm, type Prefill } from "./StartForm";

/**
 * The working half of the Experiments page: what is in play, and the form
 * that starts the next one. The shelf underneath is printed by the page.
 */
export function ExperimentsClient({ live }: { live: ExperimentView[] }) {
  const [ending, setEnding] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  function changed(exp: ExperimentView) {
    setEnding(null);
    setPrefill({
      action: exp.action,
      curiosity: exp.curiosity ?? "",
      cadence: exp.cadence,
      lengthDays: exp.lengthDays,
      previousId: exp.id,
    });
    // The form is further down the page; bring it to the person.
    setTimeout(() => document.getElementById("start")?.scrollIntoView({ block: "center" }), 60);
  }

  return (
    <div className="space-y-5">
      {live.map((exp) =>
        exp.phase === "ready" || ending === exp.id ? (
          <div key={exp.id} className="space-y-3.5">
            {exp.phase === "ready" && <RunningCard exp={exp} />}
            <CloseForm
              exp={exp}
              early={exp.phase !== "ready"}
              onCancel={exp.phase !== "ready" ? () => setEnding(null) : undefined}
              onChanged={changed}
            />
          </div>
        ) : (
          <RunningCard key={exp.id} exp={exp} onEnd={() => setEnding(exp.id)} />
        ),
      )}
      <StartForm
        full={live.length >= MAX_RUNNING && !prefill}
        prefill={prefill}
        onStarted={() => setPrefill(null)}
      />
    </div>
  );
}
