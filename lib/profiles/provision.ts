import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/schema/external/auth";
import { ensureWorkspaceForUser } from "@/lib/db/workspace/auto-create";
import type { ProfileConfig } from "./config";

/**
 * Find or create the user row for a profile, then ensure they have a
 * workspace.
 *
 * Match strategy: case-insensitive email lookup. If a user already exists
 * with that email (e.g. you signed up via magic link before, or EC created
 * the user), we re-use that user's id. Otherwise we INSERT a fresh row.
 *
 * Returns the resolved user_id so the caller can stash it in the profile
 * cookie.
 */
export async function findOrCreateUserForProfile(
  profile: ProfileConfig,
): Promise<string> {
  const emailNorm = profile.email.trim().toLowerCase();

  // 1. Try to find an existing user.
  const existing = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, emailNorm))
    .limit(1);

  if (existing.length > 0) {
    const userId = existing[0].id;
    // Make sure they have a workspace too.
    await ensureWorkspaceForUser({ id: userId, name: profile.name }).catch(
      (e) => console.error("ensureWorkspaceForUser failed:", e),
    );
    return userId;
  }

  // 2. Create a new user.
  const [created] = await db
    .insert(authUsers)
    .values({
      name: profile.name,
      email: emailNorm,
      emailVerified: true,
    })
    .returning({ id: authUsers.id });

  // 3. Auto-provision their workspace.
  await ensureWorkspaceForUser({
    id: created.id,
    name: profile.name,
  }).catch((e) => console.error("ensureWorkspaceForUser failed:", e));

  return created.id;
}
