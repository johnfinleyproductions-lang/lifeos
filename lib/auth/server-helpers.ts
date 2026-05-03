/**
 * Server-side auth helpers.
 *
 * Resolution order for getAuthContext:
 *   1. Real Better Auth session — wins if user signed in via /auth
 *   2. Active profile cookie — household / shared-device mode (/pick-profile)
 *   3. Single-user fallback env vars — for personal-only deploys
 *   4. null → caller redirects to /pick-profile
 *
 * The profile cookie is the primary path for the two-profile model. The
 * magic-link auth at /auth still works as an escape hatch (and for any
 * users beyond the configured profile list).
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "./server";
import type { AppUser, AuthSession } from "./types";
import { getActiveProfile } from "@/lib/profiles/cookie";

const SIGN_IN_URL = "/pick-profile";

const FALLBACK_USER_ID = process.env.LIFEOS_FALLBACK_USER_ID?.trim();
const FALLBACK_USER_NAME =
  process.env.LIFEOS_FALLBACK_USER_NAME?.trim() || "User";
const FALLBACK_USER_EMAIL =
  process.env.LIFEOS_FALLBACK_USER_EMAIL?.trim() || "";

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

function buildSyntheticUser(opts: {
  id: string;
  name: string;
  email: string;
}): AppUser {
  return {
    id: opts.id,
    name: opts.name,
    email: opts.email,
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    fullName: opts.name,
    avatarUrl: null,
  } as unknown as AppUser;
}

function buildSyntheticSession(user: AppUser): AuthSession {
  return {
    session: {
      id: "synthetic",
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      token: "synthetic",
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user,
  } as unknown as AuthSession;
}

export async function getAuthContext(): Promise<ServerAuthContext> {
  // 1. Real Better Auth session
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  if (session) {
    return { session, user: mapAuthUser(session.user) };
  }

  // 2. Active profile cookie (the two-profile model)
  const activeProfile = await getActiveProfile();
  if (activeProfile) {
    const user = buildSyntheticUser({
      id: activeProfile.userId,
      name: activeProfile.name,
      email: activeProfile.email,
    });
    return { session: buildSyntheticSession(user), user };
  }

  // 3. Env-var fallback (legacy single-user mode)
  if (FALLBACK_USER_ID) {
    const user = buildSyntheticUser({
      id: FALLBACK_USER_ID,
      name: FALLBACK_USER_NAME,
      email: FALLBACK_USER_EMAIL,
    });
    return { session: buildSyntheticSession(user), user };
  }

  return { session: null, user: null };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const { user } = await getAuthContext();
  return user;
}

export async function requireUserContext(): Promise<{
  session: AuthSession;
  user: AppUser;
}> {
  const { session, user } = await getAuthContext();

  if (session && user) {
    return { session, user };
  }

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
      unauthorizedResponse: NextResponse.json(
        { error: message },
        { status: 401 },
      ),
    };
  }

  return { session, user, unauthorizedResponse: null };
}
