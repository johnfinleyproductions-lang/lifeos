/**
 * Server-side auth helpers, mirroring EC's pattern.
 *
 * For Server Components and API routes, prefer these over calling
 * `auth.api.getSession()` directly so behavior stays consistent.
 *
 * If the user has no session, `requireUser()` redirects to EC's `/auth`
 * (which is where the modal lives in this fork — there is no
 * `/auth/login` page).
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "./server";
import type { AppUser, AuthSession } from "./types";

const EC_AUTH_URL = `${
  process.env.NEXT_PUBLIC_EC_URL?.trim() ||
  "https://app.evergreenwellnessmktg.com"
}/auth`;

export type ServerAuthContext = {
  session: AuthSession | null;
  user: AppUser | null;
};

function mapAuthUser(user: AuthSession["user"]): AppUser {
  return {
    ...user,
    fullName: user.name,
    avatarUrl: user.image ?? null,
  };
}

export async function getAuthContext(): Promise<ServerAuthContext> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return {
    session,
    user: session ? mapAuthUser(session.user) : null,
  };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const { user } = await getAuthContext();
  return user;
}

/**
 * Server Component / Server Action helper. Throws via redirect() if the
 * user is not signed in. Sends them to EC's auth modal — when they sign
 * in there, the cookie set on the shared domain (production) or shared
 * host (localhost dev) will validate next time they hit LifeOS.
 */
export async function requireUserContext(): Promise<{
  session: AuthSession;
  user: AppUser;
}> {
  const { session, user } = await getAuthContext();

  if (!session || !user) {
    redirect(EC_AUTH_URL);
  }

  return { session, user };
}

export async function requireUser(): Promise<AppUser> {
  const { user } = await requireUserContext();
  return user;
}

/**
 * For API routes — returns a 401 instead of redirecting.
 */
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
      unauthorizedResponse: NextResponse.json(
        { error: message },
        { status: 401 },
      ),
    };
  }

  return { session, user, unauthorizedResponse: null };
}
