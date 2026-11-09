"use client";

import { useEffect, useState } from "react";

const OPTIONS: { value: "day" | "night"; label: string; desc: string }[] = [
  {
    value: "day",
    label: "Day",
    desc: "Cream laid stock, warm black ink. Where everyone starts.",
  },
  {
    value: "night",
    label: "Night",
    desc: "Dark stock, the same inks. For late hours.",
  },
];

/**
 * The same switch as the one at the foot of the rail, in Settings as well
 * so it is findable. Reads and writes `lifeos-theme`, which the inline
 * boot script in app/layout.tsx applies before first paint.
 */
export function ThemeChoice() {
  const [theme, setTheme] = useState<"day" | "night">("day");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setTheme(t === "night" ? "night" : "day");
    setHydrated(true);
  }, []);

  function pick(next: "day" | "night") {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("lifeos-theme", next);
    } catch {
      // storage can be unavailable; the page still flips for this visit
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Theme">
      {OPTIONS.map((opt) => {
        const active = hydrated && theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => pick(opt.value)}
            aria-pressed={active}
            className={`text-left px-4 py-3.5 border-[1.5px] border-ink-50 ${
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
  );
}
