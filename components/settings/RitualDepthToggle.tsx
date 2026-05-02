"use client";

import { useEffect, useState } from "react";
import {
  type RitualDepth,
  getRitualDepthDefault,
  setRitualDepthDefault,
} from "@/lib/settings/ritual-depth";

const OPTIONS: {
  value: RitualDepth;
  label: string;
  desc: string;
}[] = [
  {
    value: "quick",
    label: "Quick",
    desc: "Just the essentials. Three prompts, ~30 seconds.",
  },
  {
    value: "standard",
    label: "Standard",
    desc: "Five prompts. Around 90 seconds. The default rhythm.",
  },
  {
    value: "deep",
    label: "Deep",
    desc: "Five plus reframe + release at evening. ~3 minutes.",
  },
];

export function RitualDepthToggle() {
  const [depth, setDepth] = useState<RitualDepth>("standard");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDepth(getRitualDepthDefault());
    setHydrated(true);
  }, []);

  function pick(next: RitualDepth) {
    setDepth(next);
    setRitualDepthDefault(next);
  }

  return (
    <div className="space-y-2">
      {OPTIONS.map((opt) => {
        const active = hydrated && depth === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => pick(opt.value)}
            className={`w-full text-left p-4 rounded-xl border transition ${
              active
                ? "border-accent-violet/50 bg-accent-violet/5"
                : "border-white/5 hover:border-white/15"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div
                className={`font-serif text-base ${
                  active ? "text-accent-violet" : "text-ink-100"
                }`}
              >
                {opt.label}
              </div>
              {active && (
                <span className="text-[10px] uppercase tracking-wider text-accent-violet">
                  current
                </span>
              )}
            </div>
            <div className="text-xs text-ink-300">{opt.desc}</div>
          </button>
        );
      })}
      <div className="text-[11px] text-ink-400 mt-3">
        Saved to this browser. Phase 5 will sync this to your account so it
        follows you across devices.
      </div>
    </div>
  );
}
