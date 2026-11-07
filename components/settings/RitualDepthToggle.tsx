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
    desc: "Just the essentials. Three prompts, about thirty seconds.",
  },
  {
    value: "standard",
    label: "Standard",
    desc: "Five prompts. Around 90 seconds. The default rhythm.",
  },
  {
    value: "deep",
    label: "Deep",
    desc: "Five, plus reframe and release at evening. About three minutes.",
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
    <div>
      <div className="space-y-2" role="group" aria-label="Ritual depth">
        {OPTIONS.map((opt) => {
          const active = hydrated && depth === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => pick(opt.value)}
              aria-pressed={active}
              className={`w-full text-left px-4 py-3.5 border-[1.5px] border-ink-50 ${
                active
                  ? "bg-ink-50 text-ink-900"
                  : "bg-transparent hover:bg-ink-700"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="text-[15px]"
                  style={{ fontVariationSettings: "'wdth' 96, 'wght' 720" }}
                >
                  {opt.label}
                </span>
                {active && <span className="tab tab-spot">Current</span>}
              </div>
              <div
                className={`text-[13px] mt-1 ${active ? "opacity-70" : "text-ink-300"}`}
              >
                {opt.desc}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[11.5px] text-ink-400 mt-3">
        Saved to this browser. Phase 5 will sync this to your account so it
        follows you across devices.
      </p>
    </div>
  );
}
