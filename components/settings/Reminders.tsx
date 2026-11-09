"use client";

import { useEffect, useState } from "react";

const KEY = "lifeos-reminders";

type Choice = { morningOn: boolean; morning: string; eveningOn: boolean; evening: string };

const DEFAULTS: Choice = { morningOn: true, morning: "07:00", eveningOn: true, evening: "21:00" };

/**
 * Two reminders a day, handed to the calendar the person already uses.
 * See lib/reminders/ics.ts for why a calendar and not push notifications.
 * The times are remembered on this device only, as a convenience; the
 * calendar is where the reminders actually live.
 */
export function Reminders() {
  const [choice, setChoice] = useState<Choice>(DEFAULTS);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (saved && typeof saved === "object") setChoice({ ...DEFAULTS, ...saved });
    } catch {
      // Nothing saved, or storage is off. The defaults stand.
    }
  }, []);

  function change(patch: Partial<Choice>) {
    const next = { ...choice, ...patch };
    setChoice(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Still works for this visit.
    }
  }

  const params = new URLSearchParams();
  if (choice.morningOn && choice.morning) params.set("morning", choice.morning);
  if (choice.eveningOn && choice.evening) params.set("evening", choice.evening);
  const ready = params.toString().length > 0;

  return (
    <div className="sheet">
      <div className="grid gap-4 sm:grid-cols-2">
        <Row
          id="remind-morning"
          label="Set the day"
          on={choice.morningOn}
          time={choice.morning}
          onToggle={(morningOn) => change({ morningOn })}
          onTime={(morning) => change({ morning })}
        />
        <Row
          id="remind-evening"
          label="Close the day"
          on={choice.eveningOn}
          time={choice.evening}
          onToggle={(eveningOn) => change({ eveningOn })}
          onTime={(evening) => change({ evening })}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {ready ? (
          <a className="btn" href={`/api/reminders?${params.toString()}`} download="lifeos-reminders.ics">
            Add to my calendar
          </a>
        ) : (
          <span className="btn opacity-50" aria-disabled="true">
            Add to my calendar
          </span>
        )}
        <p className="m-0 text-[13.5px] text-ink-300 max-w-[46ch]">
          Opens in your calendar as two daily events with an alert. Changed your mind about the
          times? Add it again and the old ones are replaced. To stop them, delete the events.
        </p>
      </div>
    </div>
  );
}

function Row(props: {
  id: string;
  label: string;
  on: boolean;
  time: string;
  onToggle: (on: boolean) => void;
  onTime: (time: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 min-h-11">
      <input
        id={`${props.id}-on`}
        type="checkbox"
        className="w-5 h-5 accent-[rgb(var(--text-1))]"
        checked={props.on}
        onChange={(e) => props.onToggle(e.target.checked)}
      />
      <label htmlFor={`${props.id}-on`} className="flex-1 text-[15px] font-semibold">
        {props.label}
      </label>
      <label htmlFor={props.id} className="sr-only">
        {props.label} at
      </label>
      <input
        id={props.id}
        type="time"
        className="pick !pr-2.5 !bg-none tabular-nums"
        value={props.time}
        disabled={!props.on}
        onChange={(e) => props.onTime(e.target.value)}
      />
    </div>
  );
}
