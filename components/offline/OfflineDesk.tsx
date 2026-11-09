"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cachedHabits,
  discard,
  flush,
  lastWho,
  offlineFetch,
  onOutboxChange,
  pending,
  sendable,
  type CachedHabit,
  type OutboxItem,
  type Who,
  type WriteKind,
} from "@/lib/offline/outbox";

const ENERGY = ["spent", "tired", "okay", "good", "lit"] as const;
const RATING = ["off", "rough", "okay", "good", "alive"] as const;

type Reach = "checking" | "up" | "down";

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay
    ? time
    : `${d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}, ${time}`;
}

function firstWords(text: string, n = 7): string {
  const words = text.trim().split(/\s+/);
  return words.slice(0, n).join(" ") + (words.length > n ? "…" : "");
}

/**
 * The offline desk: the four things worth writing down before a connection
 * comes back. A journal entry, a short morning page, a short evening page,
 * and today's habit ticks.
 *
 * Every save here tries the server first and keeps the write on the device
 * if that fails, so the desk is safe to use whether or not you are really
 * offline. Nothing on this page is read from the database.
 */
export function OfflineDesk() {
  const [who, setWho] = useState<Who | null>(null);
  const [ready, setReady] = useState(false);
  const [reach, setReach] = useState<Reach>("checking");
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [habits, setHabits] = useState<CachedHabit[]>([]);
  const [note, setNote] = useState<{ kind: WriteKind; text: string } | null>(null);
  const [busy, setBusy] = useState<WriteKind | "send" | null>(null);

  const [entry, setEntry] = useState("");
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState("");
  const [priorities, setPriorities] = useState(["", "", ""]);
  const [rating, setRating] = useState(3);
  const [dayMood, setDayMood] = useState("");
  const [win, setWin] = useState("");

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/health", {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      setReach(res.ok ? "up" : "down");
      return res.ok;
    } catch {
      setReach("down");
      return false;
    }
  }, []);

  useEffect(() => {
    setWho(lastWho());
    setHabits(cachedHabits());
    setItems(pending());
    setReady(true);
    void check();
    const stop = onOutboxChange(() => setItems(pending()));
    const onOnline = () => void check();
    window.addEventListener("online", onOnline);
    return () => {
      stop();
      window.removeEventListener("online", onOnline);
    };
  }, [check]);

  async function keep(
    kind: WriteKind,
    url: string,
    body: Record<string, unknown>,
    label: string,
    after: () => void,
  ) {
    setBusy(kind);
    setNote(null);
    try {
      const res = await offlineFetch(url, body, { kind, label });
      const data = (await res.json().catch(() => ({}))) as { queued?: boolean; error?: string };
      if (!res.ok) {
        setNote({
          kind,
          text:
            res.status === 401
              ? "You are connected but signed out. Sign in and it will save."
              : data.error ?? "That did not save.",
        });
        return;
      }
      after();
      setNote({
        kind,
        text: data.queued ? "Kept on this device. It sends when you are back." : "Saved.",
      });
      if (!data.queued) setReach("up");
    } finally {
      setBusy(null);
    }
  }

  async function sendNow() {
    setBusy("send");
    setNote(null);
    try {
      const up = await check();
      if (up) await flush(who?.slug);
    } finally {
      setItems(pending());
      setBusy(null);
    }
  }

  const tickedToday = new Set(
    items
      .filter(
        (i) =>
          i.kind === "habit" &&
          i.body.completed === true &&
          new Date(i.writtenAt).toDateString() === new Date().toDateString(),
      )
      .map((i) => i.url),
  );

  const filled = priorities.map((p) => p.trim()).filter(Boolean);
  const canWrite = ready && who !== null;
  const live = sendable(items);

  return (
    <div className="space-y-6">
      <div className="sheet sheet-bare">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <p className="t-read m-0 max-w-[50ch]" id="desk-status">
            {reach === "checking" && "Checking the connection."}
            {reach === "down" &&
              "LifeOS cannot reach your data right now. Write here and it is kept on this device, then sent when the connection returns."}
            {reach === "up" &&
              (live > 0
                ? "The connection is back. Send what is waiting, or keep writing."
                : "You are connected. Anything you write here is saved straight away.")}
          </p>
          <span className={reach === "up" ? "tab" : "tab tab-spot"}>
            {reach === "up" ? "Connected" : reach === "down" ? "Offline" : "Checking"}
          </span>
        </div>
        {ready && (
          <p className="lbl mt-3 mb-0">
            {who
              ? `Writing as ${who.name}.`
              : "Nobody has signed in on this device yet, so there is no one to file writing under. Sign in once while connected and the desk will work from then on."}
          </p>
        )}
        {reach === "up" && (
          <a href="/" className="btn btn-sm btn-ghost mt-4">
            Back to Today
          </a>
        )}
      </div>

      {items.length > 0 && (
        <Block title={live > 0 ? `${live} waiting to send` : "Could not be sent"}>
          <ul className="m-0 p-0 list-none divide-y divide-[rgb(var(--line))]" id="desk-waiting">
            {items.map((item) => (
              <li key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[14.5px] truncate">{item.label}</div>
                  <div className="lbl mt-0.5">
                    {when(item.writtenAt)}
                    {item.problem ? ` · ${item.problem}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost shrink-0"
                  onClick={() => discard(item.id)}
                  aria-label={`Discard ${item.label}`}
                >
                  Discard
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-sm mt-3"
            onClick={sendNow}
            disabled={busy === "send" || live === 0}
          >
            {busy === "send" ? "Sending" : "Try sending now"}
          </button>
        </Block>
      )}

      <Block title="Journal" note={note?.kind === "journal" ? note.text : null}>
        <textarea
          className="ta"
          rows={6}
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="What is on your mind?"
          aria-label="Journal entry"
          disabled={!canWrite}
        />
        <button
          type="button"
          className="btn mt-3"
          disabled={!canWrite || busy === "journal" || entry.trim().length === 0}
          onClick={() =>
            keep(
              "journal",
              "/api/journal/entries",
              { mode: "stream", body: entry.trim() },
              `Journal: ${firstWords(entry)}`,
              () => setEntry(""),
            )
          }
        >
          Keep this entry
        </button>
      </Block>

      <Block title="Morning page" note={note?.kind === "morning" ? note.text : null}>
        <Five label="Energy" names={ENERGY} value={energy} onChange={setEnergy} disabled={!canWrite} />
        <input
          className="inp mt-3"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="The feeling underneath it, in a word"
          aria-label="Mood"
          maxLength={60}
          disabled={!canWrite}
        />
        {priorities.map((p, i) => (
          <input
            key={i}
            className="inp mt-2"
            value={p}
            onChange={(e) =>
              setPriorities(priorities.map((old, j) => (j === i ? e.target.value : old)))
            }
            placeholder={i === 0 ? "The one thing today is for" : "And another, if there is one"}
            aria-label={`Priority ${i + 1}`}
            maxLength={140}
            disabled={!canWrite}
          />
        ))}
        <button
          type="button"
          className="btn mt-3"
          disabled={!canWrite || busy === "morning" || !mood.trim() || filled.length === 0}
          onClick={() =>
            keep(
              "morning",
              "/api/morning",
              { energy, mood: mood.trim(), priorities: filled, depth: "quick" },
              `Morning page: ${firstWords(filled[0], 5)}`,
              () => {
                setMood("");
                setPriorities(["", "", ""]);
              },
            )
          }
        >
          Keep the morning page
        </button>
      </Block>

      <Block title="Evening page" note={note?.kind === "evening" ? note.text : null}>
        <Five label="How the day went" names={RATING} value={rating} onChange={setRating} disabled={!canWrite} />
        <input
          className="inp mt-3"
          value={dayMood}
          onChange={(e) => setDayMood(e.target.value)}
          placeholder="How it felt, in a word"
          aria-label="Mood of the day"
          maxLength={60}
          disabled={!canWrite}
        />
        <input
          className="inp mt-2"
          value={win}
          onChange={(e) => setWin(e.target.value)}
          placeholder="One thing that went right"
          aria-label="Win"
          maxLength={280}
          disabled={!canWrite}
        />
        <button
          type="button"
          className="btn mt-3"
          disabled={!canWrite || busy === "evening" || !dayMood.trim() || !win.trim()}
          onClick={() =>
            keep(
              "evening",
              "/api/evening",
              { dayRating: rating, dayMood: dayMood.trim(), win: win.trim(), depth: "quick" },
              `Evening page: ${firstWords(win, 5)}`,
              () => {
                setDayMood("");
                setWin("");
              },
            )
          }
        >
          Keep the evening page
        </button>
      </Block>

      {habits.length > 0 && (
        <Block title="Habits, today" note={note?.kind === "habit" ? note.text : null}>
          <ul className="m-0 p-0 list-none space-y-2" id="desk-habits">
            {habits.map((h) => {
              const url = `/api/habits/${h.id}/toggle`;
              const ticked = tickedToday.has(url);
              return (
                <li key={h.id} className="flex items-center justify-between gap-3">
                  <span className="text-[15px] truncate">{h.name}</span>
                  <button
                    type="button"
                    className={`btn btn-sm shrink-0 ${ticked ? "" : "btn-ghost"}`}
                    disabled={!canWrite || ticked || busy === "habit"}
                    aria-pressed={ticked}
                    onClick={() =>
                      keep("habit", url, { completed: true }, `Habit done: ${h.name}`, () => undefined)
                    }
                  >
                    {ticked ? "Kept" : "Mark done"}
                  </button>
                </li>
              );
            })}
          </ul>
        </Block>
      )}
    </div>
  );
}

function Block({
  title,
  note,
  children,
}: {
  title: string;
  note?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="t-h2 m-0">{title}</h2>
        {note && (
          <span className="lbl" role="status">
            {note}
          </span>
        )}
      </div>
      <div className="sheet">{children}</div>
    </section>
  );
}

function Five({
  label,
  names,
  value,
  onChange,
  disabled,
}: {
  label: string;
  names: readonly string[];
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="pick" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          disabled={disabled}
        >
          <span className="block text-lg" style={{ fontVariationSettings: "'wdth' 100, 'wght' 700" }}>
            {n}
          </span>
          <span className="block text-[10.5px] mt-0.5 opacity-70">{names[n - 1]}</span>
        </button>
      ))}
    </div>
  );
}
