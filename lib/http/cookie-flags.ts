/**
 * Whether the app's cookies carry the Secure flag.
 *
 * In production they do, so they only ever travel over HTTPS. The one
 * exception is the Mac app (mac/), which serves plain http on 127.0.0.1 to a
 * window on the same machine: WebKit will not store a Secure cookie from
 * http, so sign-in would silently fail there. The Mac app sets
 * LIFEOS_INSECURE_COOKIES=1 for exactly that case. Never set it on a server
 * other people reach.
 */
export function cookieSecure(): boolean {
  if (process.env.LIFEOS_INSECURE_COOKIES === "1") return false;
  return process.env.NODE_ENV === "production";
}
