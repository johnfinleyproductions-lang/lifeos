import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

// A health check that does not touch the database only proves Node is
// running, which is the one failure mode a container restart already
// covers. SELECT 1 is what distinguishes "up" from "up but useless".
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: "up" });
  } catch (err) {
    // Unauthenticated endpoint: log the detail, return none of it.
    console.error("[health] database check failed", err);
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
}
