import { cookies } from "next/headers";
import { EXPERIMENTS_COOKIE } from "./cookie";

/**
 * Whether the Experiments section is switched on.
 *
 * It is off until someone turns it on in Settings: not everyone wants to
 * run experiments, and a section nobody asked for is clutter in the rail.
 * Off means no rail entry, no card on Today and none on the evening page,
 * and no reads from the experiments tables on those pages.
 *
 * A cookie, like the other Settings choices, so the server knows on first
 * paint. That makes it per browser: switch it on once on each device.
 */
export async function experimentsOn(): Promise<boolean> {
  const store = await cookies();
  return store.get(EXPERIMENTS_COOKIE)?.value === "on";
}
