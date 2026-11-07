import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { sign, unsign } from "./signing";

/**
 * The household gate.
 *
 * /pick-profile and the switch endpoint used to be open: anyone who
 * reached the URL could select a profile and read that person's
 * check-ins and journal. On a shared device the people using it are
 * known to each other, so a single household code is the right weight.
 * It is a door, not an identity system; the per-profile cookie that
 * follows is what says who you are.
 */

const COOKIE = "lifeos_household";
const MAX_AGE = 60 * 60 * 24 * 30; // a month per device

const CODE = process.env.LIFEOS_HOUSEHOLD_CODE?.trim();

/** Whether a code is configured at all. */
export function householdCodeConfigured(): boolean {
  return Boolean(CODE && CODE.length >= 4);
}

/**
 * Deliberately fails closed. With no code set nothing unlocks, which
 * stops an upgrade from quietly leaving the old open door in place.
 */
export function checkHouseholdCode(given: string): boolean {
  if (!householdCodeConfigured()) return false;

  const a = Buffer.from(given.trim());
  const b = Buffer.from(CODE as string);
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function isHouseholdUnlocked(): Promise<boolean> {
  const store = await cookies();
  const payload = unsign(store.get(COOKIE)?.value);
  if (!payload) return false;

  const issued = Number(payload);
  if (!Number.isFinite(issued)) return false;

  return Date.now() - issued < MAX_AGE * 1000;
}

export async function unlockHousehold(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, sign(String(Date.now())), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function lockHousehold(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * A small in-memory throttle so a short numeric code cannot be walked
 * through at speed. Per instance and lost on restart, which is the
 * right weight for a home server; a distributed deploy wants this in
 * the database or a cache instead.
 */
const attempts = new Map<string, { n: number; first: number }>();
const WINDOW = 10 * 60 * 1000;
const LIMIT = 8;

export function tooManyAttempts(ip: string): boolean {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW) {
    attempts.delete(ip);
    return false;
  }
  return rec.n >= LIMIT;
}

export function recordAttempt(ip: string): void {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW) {
    attempts.set(ip, { n: 1, first: now });
    return;
  }
  rec.n += 1;
}

export function clearAttempts(ip: string): void {
  attempts.delete(ip);
}
