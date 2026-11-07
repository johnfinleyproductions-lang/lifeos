/**
 * Runs once when the server process starts, before it serves a request.
 *
 * The only job here is to resolve the household time zone so a bad
 * LIFEOS_TIMEZONE stops the process at boot with a clear message, rather
 * than being discovered on the first request, or worse, never: a silent
 * fallback to UTC would quietly file every evening entry under tomorrow.
 *
 * The check itself lives in lib/time/boot.ts and is imported only for the
 * Node runtime; this file is also compiled for the Edge runtime, which has
 * no process.exit.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/time/boot");
  }
}
