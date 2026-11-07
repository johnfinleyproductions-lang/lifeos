"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FuturePaths } from "@/lib/compass/schema";

export type CompassTab = "anchors" | "horizons";

type Props = {
  initial: {
    mission: string | null;
    eulogy: string | null;
    successDefinition: string | null;
    futurePaths: FuturePaths;
  };
  initialTab: CompassTab;
};

const HORIZONS: { key: keyof FuturePaths; label: string; prompt: string }[] =
  [
    { key: "oneYear", label: "1 year", prompt: "By next year, who am I becoming?" },
    {
      key: "threeYear",
      label: "3 years",
      prompt: "Three years out. What is true that is not true today?",
    },
    {
      key: "fiveYear",
      label: "5 years",
      prompt: "Five years from now. Describe the day, the work, the people.",
    },
    {
      key: "tenYear",
      label: "10 years",
      prompt: "Ten years out, the long view. What does the life look like?",
    },
  ];

/**
 * The compass as one sheet with two tabs cut into its edge.
 *
 * Anchors are the long-arc statements: mission, eulogy, the definition
 * of success. Horizons are the four future sketches that used to be
 * their own page at /future. They were three pages of textareas that
 * nothing but themselves ever read; now they are one sheet, one save,
 * and the mission is printed on Identity where it belongs.
 *
 * Tabs are local state rather than routes so switching never loses an
 * unsaved edit. The save writes the whole sheet, both tabs, in one
 * PATCH, and the button is ink: saving a compass is not "live, today,
 * now", so it does not take the spot.
 */
export function CompassSheet({ initial, initialTab }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<CompassTab>(initialTab);
  const [mission, setMission] = useState(initial.mission ?? "");
  const [eulogy, setEulogy] = useState(initial.eulogy ?? "");
  const [success, setSuccess] = useState(initial.successDefinition ?? "");
  const [paths, setPaths] = useState<FuturePaths>({
    oneYear: initial.futurePaths.oneYear ?? "",
    threeYear: initial.futurePaths.threeYear ?? "",
    fiveYear: initial.futurePaths.fiveYear ?? "",
    tenYear: initial.futurePaths.tenYear ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  async function save() {
    setSubmitting(true);
    setError(null);
    try {
      const futurePaths: FuturePaths = {};
      for (const h of HORIZONS) {
        const v = paths[h.key]?.trim();
        if (v) futurePaths[h.key] = v;
      }
      const res = await fetch("/api/compass", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission: mission.trim() || undefined,
          eulogy: eulogy.trim() || undefined,
          successDefinition: success.trim() || undefined,
          futurePaths,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  const filledHorizons = HORIZONS.filter((h) => paths[h.key]?.trim()).length;

  return (
    <div>
      <div className="tabstrip" role="tablist" aria-label="Compass">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "anchors"}
          aria-controls="compass-anchors"
          onClick={() => setTab("anchors")}
        >
          Anchors
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "horizons"}
          aria-controls="compass-horizons"
          onClick={() => setTab("horizons")}
        >
          Horizons
          {filledHorizons > 0 && (
            <span className="opacity-70 tabular-nums">{filledHorizons}/4</span>
          )}
        </button>
      </div>

      <div className="sheet sheet-hi">
        {tab === "anchors" ? (
          <div id="compass-anchors" role="tabpanel" className="space-y-7">
            <Field label="Mission" sub="One sentence. The thing your life is for.">
              <textarea
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="My mission is to"
                className="ta"
              />
            </Field>
            <Field
              label="Eulogy"
              sub="How do you want to be remembered? Write it in the third person."
            >
              <textarea
                value={eulogy}
                onChange={(e) => setEulogy(e.target.value)}
                rows={6}
                maxLength={4000}
                placeholder="They were the kind of person who"
                className="ta"
              />
            </Field>
            <Field
              label="Definition of success"
              sub="Yours, not anyone else's. What does a good life look like for you?"
            >
              <textarea
                value={success}
                onChange={(e) => setSuccess(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Success looks like"
                className="ta"
              />
            </Field>
          </div>
        ) : (
          <div id="compass-horizons" role="tabpanel" className="space-y-7">
            {HORIZONS.map((h) => (
              <Field key={h.key} label={h.label} sub={h.prompt}>
                <textarea
                  value={paths[h.key] ?? ""}
                  onChange={(e) =>
                    setPaths((prev) => ({ ...prev, [h.key]: e.target.value }))
                  }
                  rows={4}
                  maxLength={2000}
                  placeholder="Sketch it"
                  className="ta"
                />
              </Field>
            ))}
          </div>
        )}

        {error && (
          <div className="alert mt-6" role="alert">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between gap-4 mt-7 pt-5 border-t-[1.5px] border-ink-50">
          <span
            className="text-[12.5px] text-ink-300"
            style={savedFlash ? { fontVariationSettings: "'wght' 700" } : undefined}
            role="status"
          >
            {savedFlash
              ? "Saved."
              : "Both tabs save together. The mission prints on Identity."}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={submitting}
            className="btn shrink-0"
          >
            {submitting ? "Saving" : "Save compass"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="tab-row mb-2.5">
        <span className="tab">{label}</span>
        <span className="fill" />
      </div>
      <p className="text-[13.5px] text-ink-300 mb-2.5">{sub}</p>
      {children}
    </section>
  );
}
