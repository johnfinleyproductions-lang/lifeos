import { dayOfYear, type DayKey } from "@/lib/time/day";
import { LENSES, type Lens } from "./lenses";

/**
 * The lens of the day.
 *
 * The journal used to open on a blank Stream page with "Dear universe,"
 * for a placeholder, and kept its twelve lenses behind a mode switch.
 * Now it opens on Framework with one lens already chosen, and the lens
 * turns over with the date: the twelve in order, one per day, so a week
 * of mornings never shows the same question twice and the whole deck
 * comes round in twelve days. Keyed to the household day, not the
 * clock, so the server and the browser agree on which lens it is.
 */
export function lensForDay(key: DayKey): Lens {
  const i = (dayOfYear(key) - 1) % LENSES.length;
  return LENSES[((i % LENSES.length) + LENSES.length) % LENSES.length];
}
