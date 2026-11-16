import type { ExperimentView } from "@/lib/experiments/load";

/**
 * What the evening ratings say about an experiment, in sentences with an
 * honest range (lib/experiments/effect). Prints nothing when there is
 * nothing to say.
 */
export function Evidence({ evidence }: { evidence: ExperimentView["evidence"] }) {
  if (evidence.lines.length === 0) return null;
  return (
    <div className="mt-4" data-evidence>
      <div className="lbl mb-1">What the evenings say</div>
      {evidence.lines.map((line) => (
        <p key={line} className="m-0 mt-1 text-[13.5px] leading-[1.5] text-ink-300">
          {line}
        </p>
      ))}
      {evidence.caution && (
        <p className="m-0 mt-1.5 text-[12.5px] italic text-ink-400">{evidence.caution}</p>
      )}
    </div>
  );
}
