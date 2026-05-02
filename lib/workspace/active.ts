/**
 * Resolve a user's active workspace.
 *
 * Phase 1 strategy: pick the user's earliest-joined workspace_member row.
 * This works because EC auto-creates a default workspace for every user
 * (see EC's `ensureDefaultWorkspaceForUser` hook on user.create).
 *
 * Phase 5+ will introduce a UI workspace switcher and persist the user's
 * active workspace selection (likely on a profile or session column).
 * Until then, "active" = "earliest joined".
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";

export async function getActiveWorkspaceId(
  userId: string,
): Promise<string | null> {
  const member = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaceMembers.joinedAt)
    .limit(1);

  return member[0]?.workspaceId ?? null;
}

export async function requireActiveWorkspaceId(
  userId: string,
): Promise<string> {
  const workspaceId = await getActiveWorkspaceId(userId);
  if (!workspaceId) {
    throw new Error(
      `No workspace found for user ${userId}. EC's default-workspace hook may not have run.`,
    );
  }
  return workspaceId;
}
