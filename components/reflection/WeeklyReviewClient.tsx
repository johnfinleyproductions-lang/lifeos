"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BALANCE_DIMENSIONS, type BalanceScore } from "@/lib/reflection/balance";
import type { Scorecard } from "@/lib/reflection/auto-detect";

type Quest = {
  id: string;
  title: string;
  domain: string;
  type: string;
  progress: number;
};

type Props = {
  scorecard: Scorecard;
  suggestedWins: string[];
  activeQuests: Quest[];
};

const TOTAL_PHASES = 6;

export function WeeklyReviewClient({
  scorecard,
  suggestedWins,
  activeQuests,
}: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState(1);
  const [reflect, setReflect] = useState("");
  const [wins, setWins] = useState(
    suggestedWins.length > 0 ? suggestedWins.join("\n") : "",
  );
  const [questNotes, setQuestNotes] = useState<Record<string, string>>({});
  const [balance, setBalance] = useState<BalanceScore>({
    mind: 5,
    body: 5,
    work: 5,
    relationships: 5,
    play: 5,
    spirit: 5,
  });
  const [lesson, setLesson] = useState("");
  const [reframe, setReframe] = useState("");
  const [nextWeekFeel, setNextWeekFeel] = useState("");
  const [nextPriorities, setNextPriorities] = useState<string[]>([
    "",
    "",
    "",
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue =
    (phase === 1 && reflect.trim().length >= 4) ||
    (phase === 2 && wins.trim().length >= 4) ||
    phase === 3 ||
    phase === 4 ||
    (phase === 5 && lesson.trim().length >= 4) ||
    (phase === 6 && nextWeekFeel.trim().length >= 4);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reflection/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reflect: reflect.trim(),
          wins: wins.trim(),
          questNotes,
          balance,
          lesson: lesson.trim(),
          reframe: reframe.trim() || undefined,
          nextWeekFeel: nextWeekFeel.trim(),
          nextWeekPriorities: nextPriorities
            .map((p) => p.trim())
            .filter((p) => p.length > 0),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      router.push("/discipline");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSubmitting(false);
    }
  }

  function next() {
    if (phase === TOTAL_PHASES) submit();
    else setPhase(phase + 1);
  }
  function back() {
    setPhase(Math.max(1, phase - 1));
  }

  return (
    <div className="card max-w-3xl mx-auto">
      <div className="card-glow" />

      <div className="flex items-center justify-between mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-accent-gold">
          Weekly review · {phase} / {TOTAL_PHASES}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_PHASES }).map((_, i) => (
            <span
              key={i}
              className={`h-1 w-8 rounded-full ${
                i < phase ? "bg-accent-gold" : "bg-ink-700"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="min-h-[320px]">
        {phase === 1 && (
          <Step
            heading="What happened this week?"
            sub="Just write. The data sidebar is for reference."
          >
            <div className="grid md:grid-cols-3 gap-2 mb-5 text-xs">
              <Stat label="Morning ✓" value={`${scorecard.morningDays}/7`} />
              <Stat label="Evening ✓" value={`${scorecard.eveningDays}/7`} />
              <Stat
                label="Habits"
                value={`${scorecard.habitCompletions}/${scorecard.habitTotal || "—"}`}
              />
              <Stat label="Focus min" value={String(scorecard.focusMinutes)} />
              <Stat
                label="Quest avg"
                value={`${scorecard.questAvgProgress}%`}
              />
              <Stat
                label="Active quests"
                value={String(scorecard.activeQuestCount)}
              />
            </div>
            <textarea
              value={reflect}
              onChange={(e) => setReflect(e.target.value)}
              autoFocus
              rows={6}
              maxLength={2000}
              placeholder="The week, in your own words…"
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base leading-relaxed focus:border-white/30 focus:outline-none resize-none"
            />
          </Step>
        )}

        {phase === 2 && (
          <Step
            heading="The wins."
            sub="Auto-detected ones are pre-filled. Edit, add, or replace."
          >
            <textarea
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              autoFocus
              rows={8}
              maxLength={2000}
              placeholder="One per line."
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base leading-relaxed focus:border-accent-green/40 focus:outline-none resize-none"
            />
          </Step>
        )}

        {phase === 3 && (
          <Step
            heading="Quest check."
            sub="Quick note per active quest — what shifted, what stuck?"
          >
            {activeQuests.length === 0 ? (
              <div className="text-sm text-ink-400 italic">
                No active quests. Skip to next phase.
              </div>
            ) : (
              <div className="space-y-3">
                {activeQuests.map((q) => (
                  <div key={q.id} className="border-l-2 border-white/5 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-ink-400">
                        {q.domain} · {q.type}
                      </span>
                      <span className="text-[10px] text-ink-400">
                        {q.progress}%
                      </span>
                    </div>
                    <div className="font-serif text-base text-ink-100 mb-2">
                      {q.title}
                    </div>
                    <input
                      type="text"
                      value={questNotes[q.id] ?? ""}
                      onChange={(e) =>
                        setQuestNotes((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      maxLength={500}
                      placeholder="What moved?"
                      className="w-full bg-ink-900 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-white/30 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </Step>
        )}

        {phase === 4 && (
          <Step
            heading="Balance check."
            sub="Rate each dimension out of 10 for this week."
          >
            <div className="space-y-4">
              {BALANCE_DIMENSIONS.map((d) => (
                <div key={d.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <div className="text-sm text-ink-100">{d.label}</div>
                      <div className="text-[11px] text-ink-400">{d.blurb}</div>
                    </div>
                    <span className="font-serif text-2xl text-ink-100 tabular-nums">
                      {balance[d.key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={balance[d.key]}
                    onChange={(e) =>
                      setBalance((prev) => ({
                        ...prev,
                        [d.key]: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </Step>
        )}

        {phase === 5 && (
          <Step
            heading="What are you carrying forward?"
            sub="One clear lesson. One reframe (if any)."
          >
            <textarea
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              autoFocus
              rows={3}
              maxLength={1000}
              placeholder="The lesson."
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base focus:border-accent-sky/40 focus:outline-none resize-none mb-4"
            />
            <textarea
              value={reframe}
              onChange={(e) => setReframe(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="A reframe (optional)."
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base focus:border-accent-violet/40 focus:outline-none resize-none"
            />
          </Step>
        )}

        {phase === 6 && (
          <Step
            heading="Plant next week."
            sub="How should it feel? Top 3 priorities."
          >
            <input
              type="text"
              value={nextWeekFeel}
              onChange={(e) => setNextWeekFeel(e.target.value)}
              autoFocus
              maxLength={280}
              placeholder="Next week, I want it to feel…"
              className="w-full bg-ink-900 border border-white/5 rounded-lg px-4 py-3 text-base focus:border-accent-gold/40 focus:outline-none mb-4"
            />
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400 mb-2">
              Top 3 priorities
            </div>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-ink-700 grid place-items-center text-xs text-ink-300 shrink-0">
                    {i + 1}
                  </div>
                  <input
                    type="text"
                    value={nextPriorities[i]}
                    onChange={(e) => {
                      const next = [...nextPriorities];
                      next[i] = e.target.value;
                      setNextPriorities(next);
                    }}
                    maxLength={140}
                    placeholder={i === 0 ? "The one that matters most" : "…"}
                    className="flex-1 bg-ink-900 border border-white/5 rounded-lg px-3 py-2 text-sm focus:border-white/30 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </Step>
        )}
      </div>

      {error && (
        <div className="mt-4 text-sm text-accent-rose bg-accent-rose/10 border border-accent-rose/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={back}
          disabled={phase === 1 || submitting}
          className="text-sm text-ink-300 hover:text-ink-100 disabled:opacity-30 transition"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canContinue || submitting}
          className="px-5 py-2 rounded-lg bg-accent-gold/15 text-accent-gold border border-accent-gold/30 text-sm hover:bg-accent-gold/25 disabled:opacity-30 transition"
        >
          {submitting
            ? "Saving…"
            : phase === TOTAL_PHASES
              ? "Close the week →"
              : "Continue →"}
        </button>
      </div>
    </div>
  );
}

function Step({
  heading,
  sub,
  children,
}: {
  heading: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-serif text-2xl text-ink-50 mb-1.5 leading-snug">
        {heading}
      </h2>
      <p className="text-sm text-ink-300 mb-5">{sub}</p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/5 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">
        {label}
      </div>
      <div className="font-serif text-base text-ink-100 tabular-nums">
        {value}
      </div>
    </div>
  );
}
