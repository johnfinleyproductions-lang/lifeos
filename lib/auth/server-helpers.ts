/**
 * Who is using the app right now.
 *
 * A person is signed in when two things agree:
 *
 *   - the signed profile cookie names one of the household's profiles, and
 *   - NoCodeBackend confirms a live session for that profile's account.
 *
 * Either alone is not enough. The profile cookie without a session cannot
 * read any data, and a session for an account that is no longer on the
 * profile list does not get in.
 *
 * Signed-out visitors are sent to the profile picker, which is behind the
 * household code. See lib/profiles/ for both.
 */
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { cache } from "react";
import { getActiveProfile } from "@/lib/profiles/cookie";
import type { AppUser, AuthSession } from "./types";

const SIGN_IN_URL = "/pick-profile";

export type ServerAuthContext = {
  session: AuthSession | null;
  user: AppUser | null;
};

export const getAuthContext = cache(async (): Promise<ServerAuthContext> => {
  const profile = await getActiveProfile();
  if (!profile) return { session: null, user: null };

  const user: AppUser = {
    id: profile.userId,
    // The household's own name for the person wins over whatever the
    // account was created with, so renaming a profile is one env change.
    name: profile.name,
    email: profile.email,
    image: null,
    createdAt: profile.createdAt,
    updatedAt: profile.createdAt,
    fullName: profile.name,
    avatarUrl: null,
  };
  return { session: { user, profileSlug: profile.slug }, user };
});

export async function getCurrentUser(): Promise<AppUser | null> {
  const { user } = await getAuthContext();
  return user;
}

export async function requireUserContext(): Promise<{
  session: AuthSession;
  user: AppUser;
}> {
  const { session, user } = await getAuthContext();
  if (session && user) return { session, user };
  redirect(SIGN_IN_URL);
}

export async function requireUser(): Promise<AppUser> {
  const { user } = await requireUserContext();
  return user;
}

export async function requireApiUser(
  message = "User not authenticated",
): Promise<
  | { session: AuthSession; user: AppUser; unauthorizedResponse: null }
  | { session: null; user: null; unauthorizedResponse: NextResponse }
> {
  const { session, user } = await getAuthContext();
  if (!session || !user) {
    return {
      session: null,
      user: null,
      unauthorizedResponse: NextResponse.json({ error: message }, { status: 401 }),
    };
  }
  return { session, user, unauthorizedResponse: null };
}
