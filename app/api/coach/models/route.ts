import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { listModels, llmConfig, llmHost } from "@/lib/coach/llm";

export const dynamic = "force-dynamic";

/** What the coach's model server has available, for the picker on the Coach page. */
export async function GET() {
  const { unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  const list = await listModels();
  return NextResponse.json({
    host: llmHost(),
    defaultModel: llmConfig().defaultModel,
    ...list,
  });
}
