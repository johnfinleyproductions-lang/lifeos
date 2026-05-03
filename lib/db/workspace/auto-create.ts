import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";

/**
 * Ensure a user has at least one workspace.
 *
 * Called from Better Auth's `databaseHooks.user.create.after` so every
 * new sign-up gets a workspace + membership row created automatically.
 * Idempotent — if the user already has a workspace_member row, no-ops.
 *
 * Slug is generated from the user's name with a random suffix if needed
 * for uniqueness.
 */

function slugify(s: string): string {
  return (
    (s || "user")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "user"
  );
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export async function ensureWorkspaceForUser(user: {
  id: string;
  name?: string | null;
}): Promise<void> {
  // Already has a workspace? Skip.
  const existing = await db
    .select({ id: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1);
  if (existing.length > 0) return;

  const displayName = (user.name && user.name.trim()) || "User";
  const baseSlug = slugify(displayName);

  // Try a few slug variants if there's a collision on the unique index.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomSuffix()}`;
    try {
      const [workspace] = await db
        .insert(workspaces)
        .values({
          slug,
          name: `${displayName}'s Space`,
          ownerId: user.id,
        })
        .returning();

      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
      });
      return;
    } catch (e) {
      // Most likely a unique-violation on slug. Retry with a suffix.
      if (attempt === 4) throw e;
    }
  }
}
