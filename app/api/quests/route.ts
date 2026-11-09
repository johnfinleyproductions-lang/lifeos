import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lifeosQuests } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { createQuestSchema } from "@/lib/quests/schema";
import { currentQuarter } from "@/lib/quests/quarter";

export async function POST(request: Request) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createQuestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }


  const [created] = await db
    .insert(lifeosQuests)
    .values({
      userId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      domain: parsed.data.domain,
      type: parsed.data.type,
      quarter: parsed.data.quarter ?? currentQuarter(),
    })
    .returning();

  return NextResponse.json({ ok: true, quest: created });
}
