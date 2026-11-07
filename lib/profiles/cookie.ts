import { cookies } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/schema/auth";
import { getProfile, PROFILES, type ProfileConfig } from "./config";
import { sign, unsign } from "./signing";

const COOKIE_NAME = "lifeos_profile";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type ActiveProfile = {
  slug: string;
  userId: string;
  name: string;
  email: string;
};

/**
 * Read the active profile from the cookie, or null.
 *
 * Three things have to hold before this returns an identity:
 *
 *   1. the cookie carries our signature, so it was issued by this server
 *      rather than typed in by hand;
 *   2. the slug still names a profile, because config changes between
 *      deploys and a stale cookie should not keep someone signed in as a
 *      profile that no longer exists;
 *   3. the user id actually belongs to that profile's email in the
 *      database.
 *
 * The third check is the one the old comment here promised and skipped,
 * which left the user id in a client-held cookie trusted verbatim. It is
 * wrapped in React.cache so the extra query runs once per request rather
 * than once per call, and getAuthContext calls this on every page and
 * every API route.
 */
export const getActiveProfile = cache(
  async (): Promise<ActiveProfile | null> => {
    const cookieStore = await cookies();
    const payload = unsign(cookieStore.get(COOKIE_NAME)?.value);
    if (!payload) return null;

    const colonIdx = payload.indexOf(":");
    if (colonIdx < 0) return null;
    const slug = payload.slice(0, colonIdx);
    const userId = payload.slice(colonIdx + 1);
    if (!slug || !userId) return null;

    const profile = getProfile(slug);
    if (!profile) return null;

    const rows = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.id, userId))
      .limit(1);

    const found = rows[0];
    if (!found) return null;

    // The id must be this profile's own, not merely a real user.
    const owner = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.email, profile.email.trim().toLowerCase()))
      .limit(1);

    if (owner[0]?.id !== userId) return null;

    return {
      slug: profile.slug,
      userId,
      name: profile.name,
      email: profile.email,
    };
  },
);

export async function setActiveProfile(
  slug: string,
  userId: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sign(`${slug}:${userId}`), {
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
 * Whether a profile's user row exists yet. Used by the picker to show
 * which profiles have been used before.
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
