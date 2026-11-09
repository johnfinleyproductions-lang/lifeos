"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EXPERIMENTS_COOKIE } from "@/lib/experiments/cookie";

const OPTIONS: { value: "on" | "off"; label: string; desc: string }[] = [
  {
    value: "off",
    label: "Off",
    desc: "No Experiments entry in the rail, nothing on Today or the evening page.",
  },
  {
    value: "on",
    label: "On",
    desc: "Experiments appears in the rail under The day. A running experiment shows on Today and above the evening page so its mark is one tap.",
  },
];

/** Same shape as the field-marks control: a cookie, so the server knows on first paint. */
export function ExperimentsToggle() {
  const router = useRouter();
  const [value, setValue] = useState<"on" | "off">("off");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const on = document.cookie.split(";").some((c) => c.trim() === `${EXPERIMENTS_COOKIE}=on`);
    setValue(on ? "on" : "off");
    setHydrated(true);
  }, []);

  function pick(next: "on" | "off") {
    setValue(next);
    document.cookie = `${EXPERIMENTS_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="space-y-2" role="group" aria-label="Experiments">
      {OPTIONS.map((opt) => {
        const active = hydrated && value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => pick(opt.value)}
            aria-pressed={active}
            className={`w-full text-left px-4 py-3.5 border-[1.5px] border-ink-50 ${
              active ? "bg-ink-50 text-ink-900" : "bg-transparent hover:bg-ink-700"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[15px]" style={{ fontVariationSettings: "'wdth' 96, 'wght' 720" }}>
                {opt.label}
              </span>
              {active && <span className="tab tab-spot">Current</span>}
            </div>
            <div className={`text-[13px] mt-1 ${active ? "opacity-70" : "text-ink-300"}`}>{opt.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

/** The one-button version, for the Experiments page when the section is off. */
export function TurnExperimentsOn() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        document.cookie = `${EXPERIMENTS_COOKIE}=on; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        router.refresh();
      }}
    >
      Turn experiments on
    </button>
  );
}
