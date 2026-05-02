/**
 * Phase 1: hardcoded mock — placeholder for the Quarterly Quests panel.
 * Phase 3 wires up `lifeos_quests` table reads.
 */
export function QuestsCard() {
  return (
    <div className="card">
      <div className="card-glow" />
      <div className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
        Quarterly quests
      </div>
      <div className="font-serif text-lg text-ink-100 mb-3">Q2 · Day 1 / 90</div>
      <div className="space-y-2.5">
        <QuestRow
          domain="WORK"
          color="text-accent-violet"
          title="Ship LifeOS v1.0"
          progress={0}
        />
        <QuestRow
          domain="LIFE"
          color="text-accent-rose"
          title="Quest goes here in Phase 3"
          progress={0}
          dim
        />
      </div>
    </div>
  );
}

function QuestRow({
  domain,
  color,
  title,
  progress,
  dim = false,
}: {
  domain: string;
  color: string;
  title: string;
  progress: number;
  dim?: boolean;
}) {
  return (
    <div className={dim ? "opacity-40" : ""}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`font-medium tracking-wider ${color}`}>{domain}</span>
        <span className="text-ink-400 tabular-nums">{progress}%</span>
      </div>
      <div className="text-sm text-ink-100 mb-1.5">{title}</div>
      <div className="h-1 bg-ink-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-green to-accent-sky rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
