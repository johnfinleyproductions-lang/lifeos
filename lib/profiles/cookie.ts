import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/schema/external/auth";
import { getProfile, PROFILES, type ProfileConfig } from "./config";

const COOKIE_NAME = "lifeos_profile";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type ActiveProfile = {
  slug: string;
  userId: string;
  name: string;
  email: string;
};

/**
 * Read the active profile from the cookie, or null if not set.
 *
 * Cookie format: `<slug>:<userId>` so the userId is available without an
 * extra DB lookup on every request. We still validate that the slug
 * matches one in PROFILES — config can change between deploys, and we
 * don't want a stale cookie to keep someone logged in as a profile that
 * no longer exists.
 */
export async function getActiveProfile(): Promise<ActiveProfile | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const colonIdx = raw.indexOf(":");
  if (colonIdx < 0) return null;
  const slug = raw.slice(0, colonIdx);
  const userId = raw.slice(colonIdx + 1);

  const profile = getProfile(slug);
  if (!profile) return null;

  // Optional sanity check — make sure the user_id still exists in the DB.
  // We do this lazily; downstream queries will fail anyway if it's gone.
  return {
    slug: profile.slug,
    userId,
    name: profile.name,
    email: profile.email,
  };
}

export async function setActiveProfile(
  slug: string,
  userId: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${slug}:${userId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearActiveProfile(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Verify a profile's user actually exists in the DB. Used by the picker
 * page to detect if a profile has been provisioned yet (informational).
 */
export async function profileIsProvisioned(
  profile: ProfileConfig,
): Promise<boolean> {
  const found = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, profile.email.trim().toLowerCase()))
    .limit(1);
  return found.length > 0;
}

export { PROFILES };
