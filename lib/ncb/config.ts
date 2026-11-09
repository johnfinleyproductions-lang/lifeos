/**
 * Where NoCodeBackend lives and which database is ours.
 *
 * Only NCB_INSTANCE is required. The two API URLs have one correct value
 * today and are overridable for the day that changes.
 *
 * NCB also issues a per-database secret key, and its setup guide has every
 * request carry it. LifeOS deliberately does not use it. Probing the live
 * API showed that the key is an administrator's credential: a request that
 * carries it and no valid session is answered with every person's rows, and
 * requests that carry it share a two-second response cache that ignores who
 * is signed in. A session cookie on its own is answered correctly and only
 * ever with that person's rows, so that is all this app sends. The details
 * and the transcripts are in docs/nocodebackend.md.
 */

const DEFAULT_AUTH_URL = "https://app.nocodebackend.com/api/user-auth";
const DEFAULT_DATA_URL = "https://app.nocodebackend.com/api/data";

export type NcbConfig = {
  instance: string;
  authUrl: string;
  dataUrl: string;
};

let cached: NcbConfig | null = null;

export function ncbConfig(): NcbConfig {
  if (cached) return cached;
  const instance = process.env.NCB_INSTANCE?.trim();
  if (!instance) {
    throw new Error(
      "NCB_INSTANCE is not set. It names the NoCodeBackend database LifeOS stores everything in, for example 54318_lifeos.",
    );
  }
  cached = {
    instance,
    authUrl: (process.env.NCB_AUTH_API_URL?.trim() || DEFAULT_AUTH_URL).replace(/\/+$/, ""),
    dataUrl: (process.env.NCB_DATA_API_URL?.trim() || DEFAULT_DATA_URL).replace(/\/+$/, ""),
  };
  return cached;
}

export function ncbConfigured(): boolean {
  return Boolean(process.env.NCB_INSTANCE?.trim());
}

/** Raised for any answer from NCB that is not the one asked for. */
export class NcbError extends Error {
  readonly status: number;
  /** What kind of failure this was, for callers that react differently. */
  readonly code: "unauthorized" | "duplicate" | "network" | "failed";

  constructor(
    message: string,
    status: number,
    code: "unauthorized" | "duplicate" | "network" | "failed",
  ) {
    super(message);
    this.name = "NcbError";
    this.status = status;
    this.code = code;
  }
}

const TIMEOUT_MS = 15_000;

/**
 * After a request fails to reach NCB at all, the next few seconds of
 * requests fail at once instead of each waiting out its own timeout. A page
 * makes several requests; without this, a page opened with no connection
 * would hang for the sum of them before it could offer the offline desk.
 */
const DOWN_FOR_MS = 6_000;
let downUntil = 0;

/** True while the last attempt to reach NCB failed and the pause is running. */
export function ncbLooksDown(): boolean {
  return Date.now() < downUntil;
}

/** Set LIFEOS_NCB_TRACE=1 to log one line per request: what, status, how long. */
const TRACE = process.env.LIFEOS_NCB_TRACE === "1";

/**
 * One request to NCB. GETs are retried once on a network failure or a 5xx,
 * since repeating a read is harmless. Writes are never retried: a create that
 * timed out may still have happened.
 */
export async function ncbFetch(
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; timeoutMs?: number },
): Promise<{ status: number; text: string; setCookies: string[] }> {
  if (ncbLooksDown()) {
    throw new NcbError("Could not reach NoCodeBackend: still unreachable", 0, "network");
  }
  const attempts = init.method === "GET" ? 2 : 1;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        cache: "no-store",
        signal: AbortSignal.timeout(init.timeoutMs ?? TIMEOUT_MS),
      });
      const text = await res.text();
      downUntil = 0;
      if (TRACE) {
        const path = url.slice(url.indexOf("/api/") + 5, url.indexOf("?"));
        console.log(`[ncb] ${init.method} ${path} ${res.status} ${Date.now() - started}ms`);
      }
      if (res.status >= 500 && attempt < attempts) continue;
      return {
        status: res.status,
        text,
        setCookies: res.headers.getSetCookie?.() ?? [],
      };
    } catch (error) {
      lastError = error;
    }
  }
  const reason = lastError instanceof Error ? lastError.message : "unknown";
  downUntil = Date.now() + DOWN_FOR_MS;
  throw new NcbError(`Could not reach NoCodeBackend: ${reason}`, 0, "network");
}
