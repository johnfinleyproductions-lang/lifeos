/**
 * Server side of the outbox (lib/offline/outbox.ts): taking a write that was
 * made earlier, on a device that could not send it at the time.
 */
import { NextResponse } from "next/server";
import type { AuthSession } from "@/lib/auth/types";
import { NcbError } from "@/lib/ncb/config";

export { sheetWrittenAt, writtenAtFrom } from "./stamp";

/**
 * A kept write names its author. If someone else is signed in now, it must
 * not be filed under them: answer 409 and the device keeps it waiting.
 */
export function wrongAuthor(request: Request, session: AuthSession): NextResponse | null {
  const wanted = request.headers.get("x-lifeos-profile");
  if (!wanted || wanted === session.profileSlug) return null;
  return NextResponse.json(
    { error: "This was written by someone else on this device. It will send when they sign in." },
    { status: 409 },
  );
}

/**
 * Wrap a save route so that losing the connection part way through answers
 * 503 with `offline: true` instead of a bare 500. The outbox reads 503 as
 * "keep this and try later"; a 500 it treats as a fault in the server.
 */
export function keepable<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof NcbError && error.code === "network") {
        return NextResponse.json(
          { error: "LifeOS cannot reach its data right now.", offline: true },
          { status: 503 },
        );
      }
      throw error;
    }
  };
}
