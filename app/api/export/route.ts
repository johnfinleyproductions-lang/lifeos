import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { gatherEverything, toJson, toMarkdown } from "@/lib/export/build";
import { todayKey } from "@/lib/time/day";

export const dynamic = "force-dynamic";

/**
 * Download everything the signed-in person has in LifeOS.
 *   /api/export?format=md     to read
 *   /api/export?format=json   the complete record
 * Only ever the caller's own rows: the data layer refuses anything else.
 */
export async function GET(request: Request) {
  const { session, user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "md";
  const data = await gatherEverything(user.id);
  const person = { name: user.name, email: user.email };
  const now = new Date();
  const body = format === "json" ? toJson(person, data, now) : toMarkdown(person, data, now);
  const filename = `lifeos-${session.profileSlug}-${todayKey()}.${format}`;

  return new NextResponse(body, {
    headers: {
      "Content-Type":
        format === "json" ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
