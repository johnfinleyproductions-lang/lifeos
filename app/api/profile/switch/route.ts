import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile } from "@/lib/profiles/config";
import { ProfileSignInError, signInProfile } from "@/lib/profiles/provision";
import {
  clearSessionCookie,
  readSessionToken,
  signOut,
  writeSessionCookie,
} from "@/lib/ncb/session";
import { setActiveProfile, clearActiveProfile } from "@/lib/profiles/cookie";
import { isHouseholdUnlocked } from "@/lib/profiles/household";

const switchSchema = z.object({
  slug: z.string().min(1).max(40),
});

/**
 * POST /api/profile/switch — set the active profile cookie.
 *
 * On first selection of a profile, the user record + workspace are
 * auto-provisioned. Subsequent selections re-use the existing rows.
 *
 * The household gate is checked first. Without it this endpoint would
 * provision and sign in anyone who could reach the URL, which is what
 * it used to do.
 */
export async function POST(request: Request) {
  if (!(await isHouseholdUnlocked())) {
    return NextResponse.json(
      { error: "This device is locked." },
      { status: 401 },
    );
  }

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
    // Leave the previous profile's session behind before starting a new one.
    const previous = await readSessionToken();
    const { token } = await signInProfile(profile);
    if (previous && previous !== token) await signOut(previous);
    await writeSessionCookie(token);
    await setActiveProfile(profile.slug);
    return NextResponse.json({ ok: true, slug: profile.slug });
  } catch (e) {
    console.error("profile switch failed:", e);
    return NextResponse.json(
      {
        error:
          e instanceof ProfileSignInError
            ? e.message
            : "Could not sign this profile in. NoCodeBackend may be unreachable.",
      },
      { status: e instanceof ProfileSignInError ? 409 : 502 },
    );
  }
}

export async function DELETE() {
  const token = await readSessionToken();
  if (token) await signOut(token);
  await clearSessionCookie();
  await clearActiveProfile();
  return NextResponse.json({ ok: true });
}
