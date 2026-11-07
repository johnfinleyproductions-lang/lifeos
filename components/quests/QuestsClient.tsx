"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plate } from "@/components/field/plates";

type Quest = {
  id: string;
  title: string;
  description: string | null;
  domain: "work" | "life";
  type: "main" | "side";
  quarter: string;
  progress: number;
  status: "active" | "paused" | "completed" | "abandoned";
  /** "3 Nov 2026" once the quest is done; null otherwise, or when field marks are hidden */
  reachedOn: string | null;
};

/**
 * One riso ink per domain, the same two the Today card uses, so a quest's
 * colour means the same thing everywhere it appears.
 */
const DOMAIN_INK = {
  work: { tab: "tab tab-violet", bar: "bg-accent-violet" },
  life: { tab: "tab tab-rose", bar: "bg-accent-rose" },
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
  const ink = DOMAIN_INK[domain];

  const main = quests.filter((q) => q.type === "main");
  const side = quests.filter((q) => q.type === "side");

  return (
    <div>
      <div className="tab-row">
        <span className={ink.tab}>{label}</span>
        <span className="fill" />
        <span className="text-[11.5px] text-ink-400 tabular-nums">
          {quests.length} {quests.length === 1 ? "quest" : "quests"}
        </span>
      </div>
      <div className="space-y-3.5">
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
            className="sheet sheet-bare border-dashed w-full py-3 text-[14px] text-ink-300 hover:text-ink-50 hover:border-ink-50"
            style={{ fontVariationSettings: "'wght' 640" }}
          >
            Add a {domain} quest
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
  const ink = DOMAIN_INK[domain];

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
  const locked = updating || isComplete || isAbandoned;

  return (
    <div className={`sheet ${prominent ? "sheet-hi" : "py-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="lbl mb-1.5 flex items-center gap-2 flex-wrap">
            <span>{quest.type === "main" ? "Main quest" : "Side quest"}</span>
            {isComplete && !quest.reachedOn && (
              <span className="text-accent-green">done</span>
            )}
            {isComplete && quest.reachedOn && (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-ink-50 -mt-1">
                  <Plate name="cairn" size={22} />
                </span>
                <span className="text-accent-green">
                  summit, {quest.reachedOn}
                </span>
              </span>
            )}
            {isAbandoned && <span className="line-through">abandoned</span>}
            {isPaused && <span className="text-accent-gold">paused</span>}
          </div>
          <div
            className={`leading-[1.2] ${
              prominent ? "text-[18px]" : "text-[15.5px]"
            } ${isAbandoned ? "line-through text-ink-400" : ""}`}
            style={{ fontVariationSettings: "'wdth' 100, 'wght' 680" }}
          >
            {quest.title}
          </div>
          {quest.description && prominent && (
            <p className="text-[13px] text-ink-300 mt-1.5 leading-[1.45]">
              {quest.description}
            </p>
          )}
        </div>
        <span className="t-num text-[17px] text-ink-300 shrink-0">
          {progress}%
        </span>
      </div>

      {/* The slider is the write control, drawn as a plotted bar. */}
      <div className="range-wrap mt-3">
        <span className="plot">
          <span className={ink.bar} style={{ width: `${progress}%` }} />
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          onMouseUp={commitProgress}
          onTouchEnd={commitProgress}
          disabled={locked}
          aria-label={`Progress on ${quest.title}`}
          className="range"
        />
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-2.5">
        {!isComplete && !isAbandoned && (
          <>
            <button
              type="button"
              onClick={() => patchQuest({ status: "completed", progress: 100 })}
              disabled={updating}
              className="btn btn-sm btn-ghost"
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
              className="btn btn-sm btn-ghost"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => patchQuest({ archived: true })}
          disabled={updating}
          className="btn btn-sm btn-ghost text-ink-400"
        >
          Archive
        </button>
      </div>

      {error && (
        <div className="alert mt-3" role="alert">
          {error}
        </div>
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
    <div className="sheet sheet-hi">
      <div className="tab-row">
        <span className="tab">New {domain} quest</span>
        <span className="fill" />
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's the goal?"
        maxLength={200}
        autoFocus
        className="inp mb-3"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Why does it matter? Optional."
        rows={2}
        maxLength={1000}
        className="ta mb-4"
      />
      <div className="lbl mb-2">Type</div>
      <div className="flex gap-1.5 mb-5">
        {(["main", "side"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            aria-pressed={type === t}
            className="chip"
          >
            {t}
            {t === "main" && existingMain && (
              <span className="opacity-60">(a second)</span>
            )}
          </button>
        ))}
      </div>
      {error && (
        <div className="alert mb-3" role="alert">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-sm btn-ghost"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={submitting || title.trim().length === 0}
          className="btn btn-sm"
        >
          {submitting ? "Saving" : "Add quest"}
        </button>
      </div>
    </div>
  );
}
