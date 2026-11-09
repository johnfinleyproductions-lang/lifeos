import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { TIME_OF_DAY, buildReminderCalendar } from "@/lib/reminders/ics";
import { todayKey } from "@/lib/time/day";

export const dynamic = "force-dynamic";

/**
 * A calendar file with the morning and evening reminders.
 *   /api/reminders?morning=07:00&evening=21:00
 * Leave one out to get only the other.
 */
export async function GET(request: Request) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  const params = new URL(request.url).searchParams;
  const morning = params.get("morning");
  const evening = params.get("evening");
  for (const value of [morning, evening]) {
    if (value !== null && !TIME_OF_DAY.test(value)) {
      return NextResponse.json({ error: "Times look like 07:00." }, { status: 422 });
    }
  }
  if (!morning && !evening) {
    return NextResponse.json({ error: "Choose at least one reminder." }, { status: 422 });
  }

  // The Mac app registers lifeos:// so an alert opens the app itself. Anywhere
  // else the link is the address LifeOS is served at.
  const desktop = process.env.LIFEOS_DESKTOP === "1";
  const base = (
    process.env.LIFEOS_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    new URL(request.url).origin
  ).replace(/\/+$/, "");
  const link = (page: string) => (desktop ? `lifeos://${page}` : `${base}/${page}`);

  const file = buildReminderCalendar({
    userId: user.id,
    startDay: todayKey(),
    morning,
    evening,
    morningLink: link("morning"),
    eveningLink: link("evening"),
    now: new Date(),
  });

  return new Response(file, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lifeos-reminders.ics"',
      "Cache-Control": "no-store",
    },
  });
}
