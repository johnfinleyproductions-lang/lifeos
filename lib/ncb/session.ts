/**
 * Sign-in against NoCodeBackend's native auth, and the session that results.
 *
 * NCB runs better-auth for each database. Signing in returns a session
 * cookie; presenting that cookie on a data request is what makes NCB answer
 * with that person's rows and nobody else's.
 *
 * The browser never talks to NCB. LifeOS keeps the session token in its own
 * http-only cookie and replays it to NCB from the server. That is why there
 * is no /api/auth proxy route in this app, although NCB's guide asks for
 * one: nothing in the browser needs to reach it.
 */

import { cookies } from "next/headers";
import { cache } from "react";
import { NcbError, ncbConfig, ncbFetch } from "./config";

/** LifeOS's own cookie holding the NCB session token. */
export const SESSION_COOKIE = "lifeos_session";

/**
 * Longer than NCB's own seven days on purpose. NCB decides when a session
 * has ended; this cookie only has to outlive it.
 */
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** The name NCB looks for. It accepts it with or without a __Secure- prefix. */
const UPSTREAM_COOKIE = "better-auth.session_token";

export type NcbUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

function headers(token?: string | null): Record<string, string> {
  const { instance } = ncbConfig();
  const out: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Database-Instance": instance,
    // better-auth checks the Origin of state-changing requests. NCB accepts
    // the app's own address; it is not a secret and not trusted for anything.
    Origin: process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3001",
  };
  if (token) out.Cookie = upstreamCookieHeader(token);
  return out;
}

/** The Cookie header NCB expects for this token. */
export function upstreamCookieHeader(token: string): string {
  return `${UPSTREAM_COOKIE}=${encodeURIComponent(token)}`;
}

function authUrl(path: string): string {
  const { authUrl: base, instance } = ncbConfig();
  return `${base}/${path}?Instance=${encodeURIComponent(instance)}`;
}

function toUser(raw: unknown): NcbUser | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  if (typeof u.id !== "string" || typeof u.email !== "string") return null;
  return {
    id: u.id,
    name: typeof u.name === "string" ? u.name : "",
    email: u.email.toLowerCase(),
    createdAt: new Date(String(u.createdAt ?? Date.now())),
    updatedAt: new Date(String(u.updatedAt ?? Date.now())),
  };
}

/** Pull the session token out of NCB's Set-Cookie headers. */
function tokenFrom(setCookies: string[]): string | null {
  for (const line of setCookies) {
    const pair = line.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name.endsWith(UPSTREAM_COOKIE) && value) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

export type SignInResult =
  | { ok: true; token: string; user: NcbUser }
  | {
      ok: false;
      reason: "wrong-credentials" | "exists" | "signup-closed" | "refused";
      detail: string;
    };

async function credentialRequest(
  path: string,
  body: Record<string, string>,
): Promise<SignInResult> {
  const res = await ncbFetch(authUrl(path), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(res.text) as Record<string, unknown>;
  } catch {
    // fall through with an empty object
  }
  if (res.status === 200) {
    const token = tokenFrom(res.setCookies);
    const user = toUser(json.user);
    if (token && user) return { ok: true, token, user };
    return { ok: false, reason: "refused", detail: "NoCodeBackend signed in without a session." };
  }
  const code = typeof json.code === "string" ? json.code : "";
  const detail =
    (typeof json.message === "string" && json.message) ||
    (typeof json.error === "string" && json.error) ||
    `HTTP ${res.status}`;
  if (code === "INVALID_EMAIL_OR_PASSWORD") return { ok: false, reason: "wrong-credentials", detail };
  if (code.startsWith("USER_ALREADY_EXISTS")) return { ok: false, reason: "exists", detail };
  if (res.status === 403 && /sign-?up is disabled/i.test(detail)) {
    return { ok: false, reason: "signup-closed", detail };
  }
  return { ok: false, reason: "refused", detail };
}

export function signIn(email: string, password: string): Promise<SignInResult> {
  return credentialRequest("sign-in/email", { email, password });
}

export function signUp(name: string, email: string, password: string): Promise<SignInResult> {
  return credentialRequest("sign-up/email", { name, email, password });
}

/** End the session at NCB. Best effort: the local cookie is cleared regardless. */
export async function signOut(token: string): Promise<void> {
  recent.delete(token);
  try {
    await ncbFetch(authUrl("sign-out"), {
      method: "POST",
      headers: headers(token),
      body: "{}",
    });
  } catch {
    // Unreachable NCB must not stop someone signing out of this device.
  }
}

// A session is asked about on every page. Remembering the answer briefly
// keeps that to one round trip a minute per person instead of one per page.
const REMEMBER_MS = 60_000;
const recent = new Map<string, { user: NcbUser; until: number }>();

/** Who this token belongs to, or null if NCB no longer honours it. */
export async function userForToken(token: string): Promise<NcbUser | null> {
  const hit = recent.get(token);
  if (hit && hit.until > Date.now()) return hit.user;
  recent.delete(token);

  const res = await ncbFetch(authUrl("get-session"), {
    method: "GET",
    headers: headers(token),
  });
  if (res.status !== 200) {
    throw new NcbError(`NoCodeBackend session check failed (HTTP ${res.status}).`, res.status, "failed");
  }
  let user: NcbUser | null = null;
  try {
    const json = JSON.parse(res.text) as { user?: unknown } | null;
    user = toUser(json?.user);
  } catch {
    user = null;
  }
  if (user) {
    if (recent.size > 500) recent.clear();
    recent.set(token, { user, until: Date.now() + REMEMBER_MS });
  }
  return user;
}

/** The token in this request's cookie, if any. */
export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value || null;
}

/** The signed-in NCB user for this request, or null. Asked once per render. */
export const currentNcbSession = cache(
  async (): Promise<{ token: string; user: NcbUser } | null> => {
    const token = await readSessionToken();
    if (!token) return null;
    const user = await userForToken(token);
    return user ? { token, user } : null;
  },
);

export async function writeSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
