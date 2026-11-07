import { cookies } from "next/headers";
import { FIELD_MARKS_COOKIE } from "./field-marks-cookie";

/**
 * Whether the field marks print outside the collection page: the note
 * on Today when something new is recorded, the specimen label on each
 * habit, the cairn on a finished quest, the stamp when a day closes.
 *
 * Off is a cookie rather than a database column, so a server component
 * can honour it on first paint with no flash and no migration, and it
 * follows the browser the way the ritual-depth default does. The
 * collection page itself stays reachable either way: visiting it is
 * the opt-in.
 */
export async function fieldMarksShown(): Promise<boolean> {
  const store = await cookies();
  return store.get(FIELD_MARKS_COOKIE)?.value !== "off";
}
