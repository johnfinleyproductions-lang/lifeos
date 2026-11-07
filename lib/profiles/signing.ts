import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cookie signing for the household-device path.
 *
 * Before this existed, `lifeos_profile` carried `<slug>:<userId>` and was
 * trusted verbatim. httpOnly stops a page script reading it; it does not
 * stop anyone setting it with curl or a cookie editor, so any user id
 * could be claimed. Every value this module writes now carries an HMAC
 * over its own payload, so a cookie the server did not issue is rejected
 * before anything looks at it.
 */

const SECRET = process.env.BETTER_AUTH_SECRET?.trim();

function key(): string {
  if (!SECRET) {
    // lib/auth/server.ts already throws on a missing secret at import
    // time. This is here so that a future caller outside that path
    // cannot silently end up signing with an empty key.
    throw new Error(
      "BETTER_AUTH_SECRET is not set. Profile cookies cannot be signed.",
    );
  }
  return SECRET;
}

function mac(payload: string): string {
  return createHmac("sha256", key())
    .update(payload)
    .digest("base64url")
    .slice(0, 43);
}

/** `<payload>.<mac>` */
export function sign(payload: string): string {
  return `${payload}.${mac(payload)}`;
}

/**
 * Returns the payload if the signature is ours, otherwise null. The
 * comparison is constant-time, and a length mismatch returns early
 * rather than being fed to timingSafeEqual, which throws on unequal
 * buffers.
 */
export function unsign(value: string | undefined | null): string | null {
  if (!value) return null;

  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = value.slice(0, dot);
  const given = value.slice(dot + 1);
  const want = mac(payload);

  if (given.length !== want.length) return null;

  try {
    if (!timingSafeEqual(Buffer.from(given), Buffer.from(want))) return null;
  } catch {
    return null;
  }

  return payload;
}
