"use client";

import { usePathname } from "next/navigation";
import { Plate, PLATE_FOR } from "./plates";

/**
 * Picks the plate for whatever screen you are on, so no page has to be
 * told which drawing is its own. Longest matching route wins, which
 * keeps /journal/past on the nib and /protocols/[slug] on the keys.
 */
export function PlateForRoute({ size = 40 }: { size?: number }) {
  const pathname = usePathname() || "/";

  let plate = PLATE_FOR[pathname];

  if (!plate) {
    const route = Object.keys(PLATE_FOR)
      .filter((r) => r !== "/" && pathname.startsWith(r))
      .sort((a, b) => b.length - a.length)[0];
    plate = route ? PLATE_FOR[route] : "leaf";
  }

  return <Plate name={plate} size={size} />;
}
