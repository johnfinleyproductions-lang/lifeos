import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lifeosHabits } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { createHabitSchema } from "@/lib/habits/schema";

export async function POST(request: Request) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createHabitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }


  const [created] = await db
    .insert(lifeosHabits)
    .values({
      userId: user.id,
      name: parsed.data.name,
      cadence: parsed.data.cadence,
      description: parsed.data.description,
      stackAnchor: parsed.data.stackAnchor,
      reward: parsed.data.reward,
      protection: parsed.data.protection,
    })
    .returning();

  return NextResponse.json({ ok: true, habit: created });
}
