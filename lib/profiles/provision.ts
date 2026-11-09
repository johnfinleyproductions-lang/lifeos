/**
 * Signing a household profile in to NoCodeBackend.
 *
 * LifeOS has no passwords for people to remember. The household code opens
 * the picker, and picking a name is the whole of signing in. NCB's native
 * auth, though, wants an email and a password for each account.
 *
 * So each profile's password is derived on the server from LIFEOS_SECRET and
 * the profile's email. Nobody types it, it is stored nowhere, and it is the
 * same every time, so the server can sign the profile in whenever the
 * picker asks. The first time a profile is picked there is no account yet,
 * and one is created with that same password.
 *
 * The consequence to know about: LIFEOS_SECRET must not change once profiles
 * exist. A new secret derives new passwords, and NCB will refuse them. The
 * data is untouched if that happens; the fix is to put the old secret back,
 * or to reset that user's password in the NoCodeBackend dashboard.
 */
import { type NcbUser, signIn, signUp } from "@/lib/ncb/session";
import type { ProfileConfig } from "./config";
import { derive } from "./signing";

export class ProfileSignInError extends Error {}

function passwordFor(email: string): string {
  return derive(`ncb-profile-password:v1:${email}`);
}

export async function signInProfile(
  profile: ProfileConfig,
): Promise<{ token: string; user: NcbUser }> {
  const email = profile.email.trim().toLowerCase();
  const password = passwordFor(email);

  const first = await signIn(email, password);
  if (first.ok) return first;
  if (first.reason !== "wrong-credentials") {
    throw new ProfileSignInError(`NoCodeBackend refused the sign-in: ${first.detail}`);
  }

  // Either the account does not exist yet, or it exists with a password this
  // server can no longer derive. Creating it tells the two apart.
  const created = await signUp(profile.name, email, password);
  if (created.ok) return created;
  if (created.reason === "exists") {
    throw new ProfileSignInError(
      `There is already a NoCodeBackend account for ${email}, but its password does not match this server's LIFEOS_SECRET. Restore the original secret, or reset that user's password in NoCodeBackend.`,
    );
  }
  if (created.reason === "signup-closed") {
    throw new ProfileSignInError(
      `${profile.name} has no account yet, and sign-up is switched off in NoCodeBackend. Switch public sign-up on for the database, pick this name once, then switch it off again.`,
    );
  }
  throw new ProfileSignInError(
    `NoCodeBackend would not create an account for ${email}: ${created.detail}`,
  );
}
