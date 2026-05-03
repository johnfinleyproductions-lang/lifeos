import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile } from "@/lib/profiles/config";
import { findOrCreateUserForProfile } from "@/lib/profiles/provision";
import { setActiveProfile, clearActiveProfile } from "@/lib/profiles/cookie";

const switchSchema = z.object({
  slug: z.string().min(1).max(40),
});

/**
 * POST /api/profile/switch — set the active profile cookie.
 *
 * On first selection of a profile, the user record + workspace are
 * auto-provisioned. Subsequent selections re-use the existing rows.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = switchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed" },
      { status: 422 },
    );
  }

  const profile = getProfile(parsed.data.slug);
  if (!profile) {
    return NextResponse.json(
      { error: `Unknown profile: ${parsed.data.slug}` },
      { status: 404 },
    );
  }

  try {
    const userId = await findOrCreateUserForProfile(profile);
    await setActiveProfile(profile.slug, userId);
    return NextResponse.json({ ok: true, slug: profile.slug, userId });
  } catch (e) {
    console.error("profile switch failed:", e);
    return NextResponse.json(
      {
        error: "Failed to provision profile",
        detail: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/profile/switch — clear the active profile cookie.
 */
export async function DELETE() {
  await clearActiveProfile();
  return NextResponse.json({ ok: true });
}
