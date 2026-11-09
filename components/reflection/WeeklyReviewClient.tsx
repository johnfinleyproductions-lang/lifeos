"use client";

import { WizPlate } from "@/components/field/WizPlate";
import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { BALANCE_DIMENSIONS } from "@/lib/reflection/balance";
import type { BalanceReadings } from "@/lib/reflection/weekly-review-schema";
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

/** Each phase's engraving and the two words that name it. */
const PHASE_PLATE = [
  { plate: "calipers", name: "the week" },
  { plate: "sheaf", name: "the wins" },
  { plate: "mountain", name: "the quests" },
  { plate: "trellis", name: "the balance" },
  { plate: "lantern", name: "the lesson" },
  { plate: "sprout", name: "the planting" },
];

/** Where an untouched thumb rests. Not a reading until the control moves. */
const REST = 5;

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
  const [balance, setBalance] = useState<BalanceReadings>({});
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

  const readingsTaken = BALANCE_DIMENSIONS.filter(
    (d) => typeof balance[d.key] === "number",
  ).length;

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
      router.push("/weekly-review/past");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSubmitting(false);
    }
  }

  function next() {
    if (!canContinue || submitting) return;
    if (phase === TOTAL_PHASES) submit();
    else setPhase(phase + 1);
  }
  function back() {
    setPhase(Math.max(1, phase - 1));
  }

  /** Cmd/Ctrl+Enter in a textarea submits the phase, like Enter in an input. */
  function submitOnModEnter(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  /** Enter walks down a list of inputs; on the last one it submits. */
  function walkOnEnter(e: KeyboardEvent<HTMLInputElement>, selector: string) {
    if (e.key !== "Enter") return;
    const inputs = Array.from(
      e.currentTarget.form?.querySelectorAll<HTMLInputElement>(selector) ?? [],
    );
    const i = inputs.indexOf(e.currentTarget);
    if (i !== -1 && i < inputs.length - 1) {
      e.preventDefault();
      inputs[i + 1].focus();
    }
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

      <form
        key={phase}
        className="wiz-card wiz-plated"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <WizPlate
          n={phase}
          total={TOTAL_PHASES}
          plate={PHASE_PLATE[phase - 1].plate}
          name={PHASE_PLATE[phase - 1].name}
        />
        <div className="wiz-step sr-only">
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
              onKeyDown={submitOnModEnter}
              autoFocus
              rows={6}
              maxLength={2000}
              placeholder="The week, in your own words."
              aria-label="The week, in your own words"
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
              onKeyDown={submitOnModEnter}
              autoFocus
              rows={8}
              maxLength={2000}
              placeholder="One per line."
              aria-label="The wins, one per line"
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
                {activeQuests.map((q, i) => (
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
                      onKeyDown={(e) => walkOnEnter(e, "input[data-quest]")}
                      data-quest={q.id}
                      autoFocus={i === 0}
                      maxLength={500}
                      placeholder="What moved?"
                      aria-label={`Note on ${q.title}`}
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
            sub="Move a slider to take a reading. Leave any you did not weigh this week; an untaken reading stays blank rather than guessing."
          >
            <div className="space-y-4">
              {BALANCE_DIMENSIONS.map((d) => {
                const value = balance[d.key];
                const isSet = typeof value === "number";
                const shown = isSet ? value : REST;
                const take = (v: number) =>
                  setBalance((prev) => ({ ...prev, [d.key]: v }));
                const clear = () =>
                  setBalance((prev) => {
                    const next = { ...prev };
                    delete next[d.key];
                    return next;
                  });
                return (
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
                      <div className="flex items-center gap-2.5 shrink-0">
                        {isSet && (
                          <button
                            type="button"
                            onClick={clear}
                            className="text-[11.5px] text-ink-400 underline underline-offset-2 hover:text-ink-100 min-h-9 px-1"
                          >
                            clear
                          </button>
                        )}
                        <span
                          className={
                            isSet
                              ? "t-num text-[22px] tabular-nums"
                              : "text-[12.5px] text-ink-400 italic"
                          }
                          aria-live="polite"
                        >
                          {isSet ? value : "not set"}
                        </span>
                      </div>
                    </div>
                    <div className="range-wrap [&>.plot]:top-[12.5px]">
                      <span className="plot">
                        <span
                          className={isSet ? d.accentClass : ""}
                          style={{ width: isSet ? `${(value / 10) * 100}%` : 0 }}
                        />
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        value={shown}
                        onChange={(e) => take(Number(e.target.value))}
                        onPointerDown={() => {
                          if (!isSet) take(REST);
                        }}
                        onKeyDown={(e) => {
                          if (
                            !isSet &&
                            (e.key === " " || e.key === "Enter")
                          ) {
                            e.preventDefault();
                            take(REST);
                          }
                        }}
                        aria-label={d.label}
                        aria-valuetext={isSet ? String(value) : "not set"}
                        className={`range h-8 ${isSet ? "" : "opacity-40"}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11.5px] text-ink-400 mt-4 mb-0">
              {readingsTaken === 0
                ? "No readings taken yet. That is allowed."
                : `${readingsTaken} of 6 readings taken.`}
            </p>
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
              onKeyDown={submitOnModEnter}
              autoFocus
              rows={3}
              maxLength={1000}
              placeholder="The lesson."
              aria-label="The lesson"
              className="ta mb-4"
            />
            <textarea
              value={reframe}
              onChange={(e) => setReframe(e.target.value)}
              onKeyDown={submitOnModEnter}
              rows={3}
              maxLength={1000}
              placeholder="A reframe, optional."
              aria-label="A reframe, optional"
              className="ta"
            />
          </Step>
        )}

        {phase === 6 && (
          <Step
            heading="Plant next week."
            sub="How should it feel? Then the three that matter most. They will be waiting on the first morning sheet of the week."
          >
            <input
              type="text"
              value={nextWeekFeel}
              onChange={(e) => setNextWeekFeel(e.target.value)}
              onKeyDown={(e) => walkOnEnter(e, "input[data-plant]")}
              data-plant="feel"
              autoFocus
              maxLength={280}
              placeholder="Next week, I want it to feel"
              aria-label="How next week should feel"
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
                    onKeyDown={(e) => walkOnEnter(e, "input[data-plant]")}
                    data-plant={String(i)}
                    maxLength={140}
                    placeholder={i === 0 ? "The one that matters most" : ""}
                    aria-label={`Next week priority ${i + 1}`}
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
            type="submit"
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
      </form>
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
