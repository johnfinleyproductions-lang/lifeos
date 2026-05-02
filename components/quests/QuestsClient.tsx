"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Quest = {
  id: string;
  title: string;
  description: string | null;
  domain: "work" | "life";
  type: "main" | "side";
  quarter: string;
  progress: number;
  status: "active" | "paused" | "completed" | "abandoned";
};

const DOMAIN_COLORS = {
  work: {
    accent: "text-accent-violet",
    bg: "bg-accent-violet/10",
    border: "border-accent-violet/30",
    bar: "from-accent-violet to-accent-sky",
  },
  life: {
    accent: "text-accent-rose",
    bg: "bg-accent-rose/10",
    border: "border-accent-rose/30",
    bar: "from-accent-rose to-accent-gold",
  },
} as const;

export function QuestsClient({
  quests,
  currentQuarter,
}: {
  quests: Quest[];
  currentQuarter: string;
}) {
  const work = quests.filter((q) => q.domain === "work");
  const life = quests.filter((q) => q.domain === "life");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Column
        domain="work"
        label="Work"
        quests={work}
        currentQuarter={currentQuarter}
      />
      <Column
        domain="life"
        label="Life"
        quests={life}
        currentQuarter={currentQuarter}
      />
    </div>
  );
}

function Column({
  domain,
  label,
  quests,
  currentQuarter,
}: {
  domain: "work" | "life";
  label: string;
  quests: Quest[];
  currentQuarter: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const colors = DOMAIN_COLORS[domain];

  const main = quests.filter((q) => q.type === "main");
  const side = quests.filter((q) => q.type === "side");

  return (
    <div>
      <div
        className={`text-[11px] uppercase tracking-[0.18em] mb-3 ${colors.accent}`}
      >
        {label}
      </div>
      <div className="space-y-3">
        {main.map((q) => (
          <QuestCard key={q.id} quest={q} domain={domain} prominent />
        ))}
        {side.map((q) => (
          <QuestCard key={q.id} quest={q} domain={domain} />
        ))}
        {showForm ? (
          <NewQuestForm
            domain={domain}
            quarter={currentQuarter}
            existingMain={main.length > 0}
            onCancel={() => setShowForm(false)}
            onSaved={() => setShowForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full py-3 text-sm text-ink-300 hover:text-ink-100 transition border border-dashed border-white/10 rounded-xl hover:border-white/30"
          >
            + Add {domain} quest
          </button>
        )}
      </div>
    </div>
  );
}

function QuestCard({
  quest,
  domain,
  prominent = false,
}: {
  quest: Quest;
  domain: "work" | "life";
  prominent?: boolean;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(quest.progress);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colors = DOMAIN_COLORS[domain];

  async function patchQuest(patch: {
    progress?: number;
    status?: Quest["status"];
    archived?: boolean;
  }) {
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/quests/${quest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setUpdating(false);
    }
  }

  // Debounce slider updates: only PATCH on mouseUp / change-end.
  function commitProgress() {
    if (progress !== quest.progress) {
      patchQuest({ progress });
    }
  }

  const isComplete = quest.status === "completed";
  const isAbandoned = quest.status === "abandoned";
  const isPaused = quest.status === "paused";

  return (
    <div className={`card ${prominent ? "" : "py-4"}`}>
      <div className="card-glow" />
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${colors.bg} ${colors.accent}`}
            >
              {quest.type}
            </span>
            {isComplete && (
              <span className="text-[10px] text-accent-green">✓ done</span>
            )}
            {isAbandoned && (
              <span className="text-[10px] text-ink-400 line-through">
                abandoned
              </span>
            )}
            {isPaused && (
              <span className="text-[10px] text-accent-gold">paused</span>
            )}
          </div>
          <div
            className={`font-serif ${
              prominent ? "text-lg" : "text-base"
            } text-ink-100 leading-snug ${
              isAbandoned ? "line-through opacity-60" : ""
            }`}
          >
            {quest.title}
          </div>
          {quest.description && prominent && (
            <p className="text-xs text-ink-400 mt-1.5 leading-relaxed">
              {quest.description}
            </p>
          )}
        </div>
        <span className="text-xs text-ink-400 tabular-nums shrink-0">
          {progress}%
        </span>
      </div>

      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          onMouseUp={commitProgress}
          onTouchEnd={commitProgress}
          disabled={updating || isComplete || isAbandoned}
          className="w-full accent-accent-green"
        />
        <div className="h-1 bg-ink-700 rounded-full overflow-hidden -mt-1">
          <div
            className={`h-full bg-gradient-to-r ${colors.bar} rounded-full transition-all`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3">
        {!isComplete && !isAbandoned && (
          <>
            <button
              type="button"
              onClick={() =>
                patchQuest({ status: "completed", progress: 100 })
              }
              disabled={updating}
              className="text-[11px] text-accent-green hover:text-accent-green/80 transition disabled:opacity-50"
            >
              Mark done
            </button>
            <button
              type="button"
              onClick={() =>
                patchQuest({
                  status: isPaused ? "active" : "paused",
                })
              }
              disabled={updating}
              className="text-[11px] text-ink-400 hover:text-ink-200 transition disabled:opacity-50"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => patchQuest({ archived: true })}
          disabled={updating}
          className="text-[11px] text-ink-400 hover:text-accent-rose transition disabled:opacity-50"
        >
          Archive
        </button>
      </div>

      {error && (
        <div className="text-xs text-accent-rose mt-2">{error}</div>
      )}
    </div>
  );
}

function NewQuestForm({
  domain,
  quarter,
  existingMain,
  onCancel,
  onSaved,
}: {
  domain: "work" | "life";
  quarter: string;
  existingMain: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"main" | "side">(
    existingMain ? "side" : "main",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (title.trim().length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          domain,
          type,
          quarter,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create");
      }
      onSaved();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <div className="card-glow" />
      <div className="font-serif text-base text-ink-100 mb-3">
        New {domain} quest
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's the goal?"
        maxLength={200}
        autoFocus
        className="w-full bg-ink-900 border border-white/5 rounded-lg px-3 py-2.5 text-sm focus:border-accent-green focus:outline-none mb-3"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Why does it matter? (optional)"
        rows={2}
        maxLength={1000}
        className="w-full bg-ink-900 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-accent-green focus:outline-none mb-4 resize-none"
      />
      <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400 mb-2">
        Type
      </div>
      <div className="flex gap-2 mb-5">
        {(["main", "side"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              type === t
                ? "border-accent-violet bg-accent-violet/10 text-accent-violet"
                : "border-white/10 text-ink-300 hover:border-white/30"
            }`}
          >
            {t}
            {t === "main" && existingMain && (
              <span className="ml-1 text-ink-400">(2nd)</span>
            )}
          </button>
        ))}
      </div>
      {error && <div className="text-xs text-accent-rose mb-3">{error}</div>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-ink-300 hover:text-ink-100 transition px-3 py-1.5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={submitting || title.trim().length === 0}
          className="px-4 py-1.5 rounded-lg bg-accent-green/15 text-accent-green border border-accent-green/30 text-sm hover:bg-accent-green/25 disabled:opacity-30 transition"
        >
          {submitting ? "Saving…" : "Add quest"}
        </button>
      </div>
    </div>
  );
}
