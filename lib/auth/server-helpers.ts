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
import { getProfileState } from "@/lib/profiles/cookie";
import type { AppUser, AuthSession } from "./types";

const SIGN_IN_URL = "/pick-profile";
const OFFLINE_URL = "/offline";

export type ServerAuthContext = {
  session: AuthSession | null;
  user: AppUser | null;
  /**
   * LifeOS could not reach its data to confirm who this is. Nobody is
   * signed in; pages send the person to the offline desk, where writing is
   * kept on the device until the connection returns.
   */
  offline: boolean;
};

export const getAuthContext = cache(async (): Promise<ServerAuthContext> => {
  const { profile, offline } = await getProfileState();
  if (!profile) return { session: null, user: null, offline };

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
  return { session: { user, profileSlug: profile.slug }, user, offline: false };
});

export async function getCurrentUser(): Promise<AppUser | null> {
  const { user } = await getAuthContext();
  return user;
}

export async function requireUserContext(): Promise<{
  session: AuthSession;
  user: AppUser;
}> {
  const { session, user, offline } = await getAuthContext();
  if (session && user) return { session, user };
  redirect(offline ? OFFLINE_URL : SIGN_IN_URL);
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
  const { session, user, offline } = await getAuthContext();
  if (!session || !user) {
    return {
      session: null,
      user: null,
      // 503, not 401: the person may well be signed in, it just cannot be
      // checked. The outbox keeps a write that gets this answer.
      unauthorizedResponse: offline
        ? NextResponse.json(
            { error: "LifeOS cannot reach its data right now.", offline: true },
            { status: 503 },
          )
        : NextResponse.json({ error: message }, { status: 401 }),
    };
  }
  return { session, user, unauthorizedResponse: null };
}
