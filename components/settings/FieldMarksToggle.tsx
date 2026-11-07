"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FIELD_MARKS_COOKIE } from "@/lib/collection/field-marks-cookie";

const OPTIONS: { value: "on" | "off"; label: string; desc: string }[] = [
  {
    value: "on",
    label: "Shown",
    desc: "The note on Today when something is first recorded, the specimen label on each habit, the cairn on a finished quest, the stamp when a day closes.",
  },
  {
    value: "off",
    label: "Hidden",
    desc: "None of that prints. The collection page stays in the rail and keeps the record.",
  },
];

/**
 * Stored as a cookie rather than localStorage, so the server can honour
 * it on the first paint of every page instead of flashing the marks and
 * then hiding them. Same shape as the ritual-depth control.
 */
export function FieldMarksToggle() {
  const router = useRouter();
  const [value, setValue] = useState<"on" | "off">("on");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const off = document.cookie
      .split(";")
      .some((c) => c.trim() === `${FIELD_MARKS_COOKIE}=off`);
    setValue(off ? "off" : "on");
    setHydrated(true);
  }, []);

  function pick(next: "on" | "off") {
    setValue(next);
    document.cookie = `${FIELD_MARKS_COOKIE}=${next}; path=/; max-age=${
      60 * 60 * 24 * 365
    }; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="space-y-2" role="group" aria-label="Field marks">
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
