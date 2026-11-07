"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BALANCE_DIMENSIONS,
  type BalanceScore,
} from "@/lib/reflection/balance";
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
  const [nextPriorities, setNextPriorities] = useState<string[]>(["", "", ""]);
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
    <div className="wiz">
      <div className="wiz-bar" aria-hidden="true">
        {Array.from({ length: TOTAL_PHASES }).map((_, i) => (
          <i
            key={i}
            className={
              i + 1 < phase ? "on" : i + 1 === phase ? "cur" : undefined
            }
          />
        ))}
      </div>

      <div className="wiz-card">
        <div className="wiz-step">
          Phase {phase} of {TOTAL_PHASES}
        </div>

        {phase === 1 && (
          <Step
            heading="What happened this week?"
            sub="Just write. The numbers are there for reference."
          >
            <div className="sheet sheet-bare grid grid-cols-3 gap-x-3 gap-y-3 mb-5 py-3.5">
              <Stat label="Mornings" value={`${scorecard.morningDays}/7`} />
              <Stat label="Evenings" value={`${scorecard.eveningDays}/7`} />
              <Stat
                label="Habits"
                value={`${scorecard.habitCompletions}/${scorecard.habitTotal || "0"}`}
              />
              <Stat label="Focus min" value={String(scorecard.focusMinutes)} />
              <Stat
                label="Quest average"
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
              placeholder="The week, in your own words."
              className="ta"
            />
          </Step>
        )}

        {phase === 2 && (
          <Step
            heading="The wins."
            sub="The detected ones are filled in. Edit, add, or replace."
          >
            <textarea
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              autoFocus
              rows={8}
              maxLength={2000}
              placeholder="One per line."
              className="ta"
            />
          </Step>
        )}

        {phase === 3 && (
          <Step
            heading="Quest check."
            sub="A quick note per active quest. What shifted, what stuck?"
          >
            {activeQuests.length === 0 ? (
              <p className="text-[14.5px] text-ink-400 italic">
                No active quests. Skip to the next phase.
              </p>
            ) : (
              <div className="space-y-4">
                {activeQuests.map((q) => (
                  <div key={q.id}>
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <div
                        className="text-[15.5px] leading-tight"
                        style={{ fontVariationSettings: "'wght' 680" }}
                      >
                        {q.title}
                      </div>
                      <span className="lbl shrink-0 tabular-nums">
                        {q.domain}, {q.type}, {q.progress}%
                      </span>
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
                      className="inp"
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
            sub="Rate each dimension out of ten for this week."
          >
            <div className="space-y-4">
              {BALANCE_DIMENSIONS.map((d) => (
                <div key={d.key}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div>
                      <div
                        className="text-[14.5px]"
                        style={{ fontVariationSettings: "'wght' 680" }}
                      >
                        {d.label}
                      </div>
                      <div className="text-[11.5px] text-ink-400">
                        {d.blurb}
                      </div>
                    </div>
                    <span className="t-num text-[22px] tabular-nums">
                      {balance[d.key]}
                    </span>
                  </div>
                  <div className="range-wrap">
                    <span className="plot">
                      <span
                        className={d.accentClass}
                        style={{ width: `${(balance[d.key] / 10) * 100}%` }}
                      />
                    </span>
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
                      aria-label={d.label}
                      className="range"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Step>
        )}

        {phase === 5 && (
          <Step
            heading="What are you carrying forward?"
            sub="One clear lesson. One reframe, if there is one."
          >
            <textarea
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              autoFocus
              rows={3}
              maxLength={1000}
              placeholder="The lesson."
              className="ta mb-4"
            />
            <textarea
              value={reframe}
              onChange={(e) => setReframe(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="A reframe, optional."
              className="ta"
            />
          </Step>
        )}

        {phase === 6 && (
          <Step
            heading="Plant next week."
            sub="How should it feel? Then the three that matter most."
          >
            <input
              type="text"
              value={nextWeekFeel}
              onChange={(e) => setNextWeekFeel(e.target.value)}
              autoFocus
              maxLength={280}
              placeholder="Next week, I want it to feel"
              className="inp mb-5"
            />
            <div className="lbl mb-2">The three</div>
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span
                    className="w-[26px] shrink-0 tabular-nums text-[15px] text-ink-400"
                    style={{ fontVariationSettings: "'wdth' 80, 'wght' 800" }}
                  >
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={nextPriorities[i]}
                    onChange={(e) => {
                      const next = [...nextPriorities];
                      next[i] = e.target.value;
                      setNextPriorities(next);
                    }}
                    maxLength={140}
                    placeholder={i === 0 ? "The one that matters most" : ""}
                    className="inp"
                  />
                </div>
              ))}
            </div>
          </Step>
        )}

        {error && (
          <div className="alert mt-4" role="alert">
            {error} Nothing was lost; press it again.
          </div>
        )}

        <div className="wiz-foot">
          {phase > 1 ? (
            <button
              type="button"
              onClick={back}
              disabled={submitting}
              className="btn btn-ghost"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={next}
            disabled={!canContinue || submitting}
            className={`btn btn-next ${phase === TOTAL_PHASES ? "btn-spot" : ""}`}
          >
            {submitting
              ? "Saving"
              : phase === TOTAL_PHASES
                ? "Close the week"
                : "Next"}
          </button>
        </div>
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
      <h2 className="wiz-q">{heading}</h2>
      <p className="wiz-h">{sub}</p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-l">{label}</div>
      <div className="t-num text-[17px] mt-0.5">{value}</div>
    </div>
  );
}
