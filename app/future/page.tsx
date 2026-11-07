import { redirect } from "next/navigation";

/** Future folded into the Compass sheet as its Horizons tab. */
export default function FuturePage() {
  redirect("/compass?tab=horizons");
}
