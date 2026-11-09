/**
 * Reminders, delivered by the calendar the person already has.
 *
 * LifeOS has no server that could ring a phone at seven in the morning, and
 * building one (push subscriptions, a scheduler, keys) is a lot of machinery
 * for two nudges a day. A calendar already does this well on every device a
 * person owns: lock screen, watch, laptop. So a reminder here is a small
 * calendar file with two repeating events, each with an alert and a link
 * back to the right page.
 *
 * Times are "floating": no time zone is written, so seven o'clock means
 * seven o'clock wherever the person happens to be.
 *
 * Each event has a fixed id per person. Adding the file again with new
 * times replaces the old events instead of doubling them.
 */

export const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

export type ReminderInput = {
  userId: string;
  /** "YYYY-MM-DD", the day the first reminder falls on. */
  startDay: string;
  /** "HH:MM", or null to leave the morning one out. */
  morning: string | null;
  evening: string | null;
  morningLink: string;
  eveningLink: string;
  now: Date;
};

const pad = (n: number) => String(n).padStart(2, "0");

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\;");
}

/** Calendar files cap a line at 75 bytes; longer ones continue after a space. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function event(opts: {
  uid: string;
  day: string;
  time: string;
  title: string;
  note: string;
  link: string;
  now: Date;
}): string[] {
  const start = `${opts.day.replace(/-/g, "")}T${opts.time.replace(":", "")}00`;
  return [
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${utcStamp(opts.now)}`,
    // A later copy of the same event wins over an earlier one.
    `SEQUENCE:${Math.floor(opts.now.getTime() / 60000)}`,
    `DTSTART:${start}`,
    "DURATION:PT5M",
    "RRULE:FREQ=DAILY",
    `SUMMARY:${escapeText(opts.title)}`,
    `DESCRIPTION:${escapeText(`${opts.note}\n${opts.link}`)}`,
    `URL:${opts.link}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(opts.title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
  ];
}

export function buildReminderCalendar(input: ReminderInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LifeOS//Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:LifeOS",
  ];
  if (input.morning) {
    lines.push(
      ...event({
        uid: `lifeos-morning-${input.userId}@lifeos`,
        day: input.startDay,
        time: input.morning,
        title: "Set the day",
        note: "A minute on the morning page: how you are, and up to three things.",
        link: input.morningLink,
        now: input.now,
      }),
    );
  }
  if (input.evening) {
    lines.push(
      ...event({
        uid: `lifeos-evening-${input.userId}@lifeos`,
        day: input.startDay,
        time: input.evening,
        title: "Close the day",
        note: "Thirty seconds on the evening page: strike what got done, one win, one seed for tomorrow.",
        link: input.eveningLink,
        now: input.now,
      }),
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
