/**
 * Server-side auth helpers.
 *
 * Two modes, controlled by env:
 *
 * 1. **Real auth mode** (default): validates a Better Auth session via the
 *    shared cookie. If no session, redirects to EC's `/auth`. Used for
 *    real multi-user setups where EC is deployed alongside.
 *
 * 2. **Single-user fallback mode** (when LIFEOS_FALLBACK_USER_ID is set):
 *    treats every visitor as the configured user. No login required, no
 *    cookies needed. Used when LifeOS is personal and EC isn't publicly
 *    deployed. The user_id and workspace_id come from env vars so they
 *    point at real DB rows EC already created.
 *
 * The fallback mode is what makes deployed LifeOS usable on a phone when
 * EC only runs locally.
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

function buildFallbackUser(): AppUser {
  return {
    id: FALLBACK_USER_ID!,
    name: FALLBACK_USER_NAME,
    email: FALLBACK_USER_EMAIL,
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    fullName: FALLBACK_USER_NAME,
    avatarUrl: null,
  } as unknown as AppUser;
}

function buildFallbackSession(): AuthSession {
  const user = buildFallbackUser();
  return {
    session: {
      id: "fallback",
      userId: FALLBACK_USER_ID!,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      token: "fallback",
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user,
  } as unknown as AuthSession;
}

export async function getAuthContext(): Promise<ServerAuthContext> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (session) {
    return { session, user: mapAuthUser(session.user) };
  }

  // Fallback: synthesise a session for the configured single user.
  if (FALLBACK_USER_ID) {
    const user = buildFallbackUser();
    return { session: buildFallbackSession(), user };
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

  // No session and no fallback configured — redirect to EC's auth.
  redirect(EC_AUTH_URL);
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
