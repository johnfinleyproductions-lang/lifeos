import Link from "next/link";
import { format } from "date-fns";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { CoachChat } from "@/components/coach/CoachChat";

export default async function CoachPage() {
  await requireUserContext();
  const llmHost =
    process.env.LIFEOS_LLM_BASE_URL?.trim() ||
    "http://localhost:11434/v1";
  const model = process.env.LIFEOS_LLM_MODEL?.trim() || "qwen2.5";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          ← Today
        </Link>
        <div className="text-xs text-ink-400 uppercase tracking-[0.18em]">
          {format(new Date(), "EEEE · MMMM d")}
        </div>
      </div>

      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-ink-50 mb-1">AI Coach</h1>
          <p className="text-sm text-ink-300">
            A voice that has been paying attention. Knows your data — not your
            journal.
          </p>
        </div>
        <div className="text-right text-[11px] text-ink-400">
          <div>Model: {model}</div>
          <div className="text-ink-500">
            {llmHost.replace(/^https?:\/\//, "")}
          </div>
        </div>
      </div>

      <CoachChat />
    </div>
  );
}
