/**
 * The profile this browser is using.
 *
 * Two cookies work together. `lifeos_profile` is ours: it names a household
 * profile and is signed so it cannot be edited. `lifeos_session` holds the
 * NoCodeBackend session for that profile's account (lib/ncb/session.ts).
 * A profile is active only when NCB confirms the session and the account it
 * belongs to is the one the profile's email names.
 */
import { cookies } from "next/headers";
import { cache } from "react";
import { NcbError } from "@/lib/ncb/config";
import { currentNcbSession } from "@/lib/ncb/session";
import { getProfile, getProfiles } from "./config";
import { sign, unsign } from "./signing";

const COOKIE_NAME = "lifeos_profile";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type ActiveProfile = {
  slug: string;
  userId: string;
  name: string;
  email: string;
  createdAt: Date;
};

export const getActiveProfile = cache(
  async (): Promise<ActiveProfile | null> => {
    const cookieStore = await cookies();
    const slug = unsign(cookieStore.get(COOKIE_NAME)?.value);
    if (!slug) return null;

    const profile = getProfile(slug);
    if (!profile) return null;

    let session: Awaited<ReturnType<typeof currentNcbSession>>;
    try {
      session = await currentNcbSession();
    } catch (error) {
      // NCB being unreachable must read as "cannot confirm", never as
      // "signed in". Anything else is a real fault and should surface.
      if (error instanceof NcbError && error.code === "network") return null;
      throw error;
    }
    if (!session) return null;
    if (session.user.email !== profile.email.trim().toLowerCase()) return null;

    return {
      slug: profile.slug,
      userId: session.user.id,
      name: profile.name,
      email: profile.email,
      createdAt: session.user.createdAt,
    };
  },
);

export async function setActiveProfile(slug: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sign(slug), {
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

export { getProfiles };
