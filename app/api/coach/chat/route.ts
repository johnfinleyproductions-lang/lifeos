import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/server-helpers";
import { getCoachContext } from "@/lib/coach/context";
import { buildSystemPrompt } from "@/lib/coach/system-prompt";
import { chatRequestSchema } from "@/lib/coach/schema";

/**
 * POST /api/coach/chat — streamed chat against an OpenAI-compatible LLM.
 *
 * Works with Ollama, LM Studio, vLLM, or any other server speaking the
 * OpenAI v1 chat-completions spec. Defaults assume Ollama on localhost.
 *
 * Configure via .env.local:
 *   LIFEOS_LLM_BASE_URL=http://192.168.4.180:11434/v1   (Framestation)
 *   LIFEOS_LLM_BASE_URL=http://192.168.4.200:11434/v1   (M90t)
 *   LIFEOS_LLM_API_KEY=ollama                           (any string for Ollama)
 *   LIFEOS_LLM_MODEL=qwen2.5:32b                        (whatever's pulled)
 *
 * The system prompt + LifeOS context is injected as the first message
 * (OpenAI spec uses role:"system" rather than a top-level system field).
 */
const DEFAULT_BASE = "http://localhost:11434/v1";
const DEFAULT_MODEL = "qwen2.5";
const DEFAULT_KEY = "ollama";

export async function POST(request: Request) {
  const { user, unauthorizedResponse } = await requireApiUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  const baseUrl =
    process.env.LIFEOS_LLM_BASE_URL?.trim() || DEFAULT_BASE;
  const apiKey =
    process.env.LIFEOS_LLM_API_KEY?.trim() || DEFAULT_KEY;
  const model = process.env.LIFEOS_LLM_MODEL?.trim() || DEFAULT_MODEL;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 422 },
    );
  }

  const ctx = await getCoachContext(user.id);
  const system = buildSystemPrompt({ name: user.name }, ctx);

  const messages = [
    { role: "system" as const, content: system },
    ...parsed.data.messages,
  ];

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: 1024,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: `Cannot reach LLM at ${baseUrl}. Is the server running? (${
          e instanceof Error ? e.message : "unknown"
        })`,
      },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        error: `Upstream error (${upstream.status})`,
        detail: text.slice(0, 500),
      },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
