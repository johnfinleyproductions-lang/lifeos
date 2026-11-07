import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkHouseholdCode,
  householdCodeConfigured,
  unlockHousehold,
  lockHousehold,
  tooManyAttempts,
  recordAttempt,
  clearAttempts,
} from "@/lib/profiles/household";

const unlockSchema = z.object({
  code: z.string().min(1).max(64),
});

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * POST /api/profile/unlock — open the household gate on this device.
 *
 * The picker and the switch endpoint stay shut until this succeeds. The
 * response never says whether a code is merely wrong or not configured
 * at all beyond the one case the operator needs to see, because that
 * distinction is useful to someone guessing.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);

  if (tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  if (!householdCodeConfigured()) {
    // Fails closed on purpose: without this, an upgrade would leave the
    // old open door in place. The operator sees what to do; nobody gets in.
    return NextResponse.json(
      {
        error:
          "No household code is configured. Set LIFEOS_HOUSEHOLD_CODE and redeploy.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = unlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  if (!checkHouseholdCode(parsed.data.code)) {
    recordAttempt(ip);
    return NextResponse.json({ error: "That code is not right." }, {
      status: 401,
    });
  }

  clearAttempts(ip);
  await unlockHousehold();
  return NextResponse.json({ ok: true });
}

/** DELETE /api/profile/unlock — shut the gate on this device again. */
export async function DELETE() {
  await lockHousehold();
  return NextResponse.json({ ok: true });
}
