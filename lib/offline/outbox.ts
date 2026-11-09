"use client";

/**
 * Writing that survives a lost connection.
 *
 * The four things a person writes most (the morning page, the evening page,
 * a journal entry, a habit tick) go through `offlineFetch`. When LifeOS can
 * reach its data they are sent as before. When it cannot, the write is kept
 * on this device in an outbox and sent later, in the order it was written.
 *
 * Each kept write remembers when it was written. The server files it under
 * that moment's day, not the day it finally arrives, and for the morning and
 * evening pages it steps aside if another device has saved a later version:
 * the later edit wins.
 *
 * It also remembers who was signed in. If someone else is using the device
 * when the connection returns, the write waits for its author.
 *
 * The outbox is this browser's local storage. Clearing site data, or a
 * private window closing, loses whatever is still waiting.
 */

export type WriteKind = "morning" | "evening" | "journal" | "habit";

export type OutboxItem = {
  id: string;
  kind: WriteKind;
  url: string;
  body: Record<string, unknown>;
  /** A few words for the waiting list: "Morning page", "Journal: The heron was…" */
  label: string;
  /** ISO instant the person wrote it. */
  writtenAt: string;
  /** Profile slug of the author, when known. */
  who: string | null;
  /** Why it has not gone yet, when the server answered but refused. */
  problem?: string;
  /** Times the server itself failed on it. A few, and it stops blocking the rest. */
  tries?: number;
  /** The server will never take it as written. Kept to read or discard. */
  stuck?: boolean;
};

const BOX = "lifeos-outbox";
const WHO = "lifeos-who";
const HABITS = "lifeos-habits";
const CHANGED = "lifeos-outbox-changed";
const SEND_TIMEOUT_MS = 12_000;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function pending(): OutboxItem[] {
  const items = load<OutboxItem[]>(BOX, []);
  return Array.isArray(items) ? items : [];
}

function store(items: OutboxItem[]): boolean {
  const ok = save(BOX, items);
  window.dispatchEvent(new Event(CHANGED));
  return ok;
}

/** Call `listener` whenever the outbox changes, here or in another tab. */
export function onOutboxChange(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === BOX) listener();
  };
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export type Who = { slug: string; name: string };

export function rememberWho(who: Who | null): void {
  if (who) save(WHO, who);
}

export function lastWho(): Who | null {
  return load<Who | null>(WHO, null);
}

export type CachedHabit = { id: string; name: string };

/** The habit list, kept so it can be ticked from the offline page. */
export function rememberHabits(habits: CachedHabit[]): void {
  save(HABITS, habits);
}

export function cachedHabits(): CachedHabit[] {
  const list = load<CachedHabit[]>(HABITS, []);
  return Array.isArray(list) ? list : [];
}

export function discard(id: string): void {
  store(pending().filter((item) => item.id !== id));
}

function keep(kind: WriteKind, url: string, body: Record<string, unknown>, label: string): boolean {
  const item: OutboxItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    kind,
    url,
    body,
    label,
    writtenAt: new Date().toISOString(),
    who: lastWho()?.slug ?? null,
  };
  return store([...pending(), item]);
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
}

/** True for answers that mean "could not reach the data", not "you got it wrong". */
function unreachable(status: number): boolean {
  return status >= 500;
}

/** Answers that say the data is out of reach for now, as opposed to a fault. */
function awayForNow(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

const MAX_TRIES = 3;

/** How many kept writes could still go, for the mark in the corner. */
export function sendable(items: OutboxItem[] = pending()): number {
  return items.filter((item) => !item.stuck).length;
}

/**
 * Send a write now, or keep it for later if LifeOS cannot reach its data.
 *
 * The answer always looks like a normal response. A kept write answers 202
 * with `{ ok: true, queued: true }`, so a caller that only checks `res.ok`
 * carries on as it would after a save.
 */
export async function offlineFetch(
  url: string,
  body: Record<string, unknown>,
  meta: { kind: WriteKind; label: string; whenQueued?: Record<string, unknown> },
): Promise<Response> {
  let failedWith: Response | null = null;
  try {
    const res = await post(url, body);
    if (!unreachable(res.status)) return res;
    failedWith = res;
  } catch {
    // No connection, or it timed out. Either way: keep it.
  }
  if (!keep(meta.kind, url, body, meta.label)) {
    // Storage is full or switched off. Say so rather than pretend.
    return (
      failedWith ??
      new Response(JSON.stringify({ error: "No connection, and this device could not keep the entry." }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    );
  }
  return new Response(JSON.stringify({ ok: true, queued: true, ...(meta.whenQueued ?? {}) }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
}

/** Keep a write without trying to send it. For the offline page. */
export function keepForLater(
  kind: WriteKind,
  url: string,
  body: Record<string, unknown>,
  label: string,
): boolean {
  return keep(kind, url, body, label);
}

let flushing = false;

const LOCK = "lifeos-outbox-sending";
const LEASE_MS = 45_000;

/**
 * Run `work` only if no other tab is already sending. Two tabs sending the
 * same outbox at once would each post every entry, and a journal entry
 * posted twice in the same instant is stored twice.
 *
 * Browsers have a lock for exactly this. Where it is missing, a short
 * lease in local storage does nearly as well; `beat` renews it.
 */
async function alone(work: (beat: () => void) => Promise<number>): Promise<number> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks?.request) {
    return locks.request(LOCK, { ifAvailable: true }, (lock) =>
      lock ? work(() => undefined) : Promise.resolve(0),
    );
  }
  const me = Math.random().toString(36).slice(2);
  const holder = () => load<{ id: string; until: number } | null>(LOCK, null);
  const held = holder();
  if (held && held.until > Date.now()) return 0;
  const beat = () => void save(LOCK, { id: me, until: Date.now() + LEASE_MS });
  beat();
  // Give another tab that wrote at the same moment time to show itself.
  await new Promise((r) => setTimeout(r, 25 + Math.random() * 50));
  if (holder()?.id !== me) return 0;
  try {
    return await work(beat);
  } finally {
    try {
      localStorage.removeItem(LOCK);
    } catch {
      // nothing to release
    }
  }
}

function amend(id: string, change: Partial<OutboxItem>): void {
  store(pending().map((p) => (p.id === id ? { ...p, ...change } : p)));
}

/**
 * Try to send everything that is waiting, oldest first. Stops at the first
 * write that cannot reach the server, so order is kept. Returns how many
 * went.
 *
 * `signedInAs` is the profile on this page, when known. A write by someone
 * else on the same device is left alone until they are back.
 */
export async function flush(signedInAs?: string | null): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  try {
    return await alone((beat) => sendAll(signedInAs, beat));
  } finally {
    flushing = false;
  }
}

async function sendAll(signedInAs: string | null | undefined, beat: () => void): Promise<number> {
  let sent = 0;
  for (const item of pending()) {
    beat();
    if (item.stuck) continue;
    if (signedInAs && item.who && item.who !== signedInAs) {
      if (!item.problem) amend(item.id, { problem: "Waiting for the person who wrote it to sign in." });
      continue;
    }

    let res: Response;
    try {
      res = await post(
        item.url,
        { ...item.body, writtenAt: item.writtenAt },
        item.who ? { "X-LifeOS-Profile": item.who } : {},
      );
    } catch {
      break;
    }
    if (awayForNow(res.status)) break;

    if (res.ok) {
      discard(item.id);
      sent++;
      continue;
    }

    if (unreachable(res.status)) {
      // The server is there and fell over. Give it a few goes, then let
      // the writes behind this one through.
      const tries = (item.tries ?? 0) + 1;
      if (tries < MAX_TRIES) {
        amend(item.id, { tries });
        break;
      }
      amend(item.id, { tries, stuck: true, problem: "The server failed on this one each time it was sent." });
      continue;
    }

    // The server is there and said no. Keep the write, say why, move on.
    let said = "";
    try {
      said = ((await res.json()) as { error?: string }).error ?? "";
    } catch {
      said = "";
    }
    if (res.status === 401) {
      amend(item.id, { problem: "Sign in to send this." });
    } else if (res.status === 409) {
      amend(item.id, { problem: said || "Waiting for the person who wrote it to sign in." });
    } else {
      amend(item.id, { stuck: true, problem: said || `The server would not take it (${res.status}).` });
    }
  }
  return sent;
}
