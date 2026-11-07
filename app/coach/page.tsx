import { requireUserContext } from "@/lib/auth/server-helpers";
import { CoachChat } from "@/components/coach/CoachChat";
import { PageStamp } from "@/components/PageStamp";

export default async function CoachPage() {
  await requireUserContext();
  const llmHost =
    process.env.LIFEOS_LLM_BASE_URL?.trim() ||
    "http://localhost:11434/v1";
  const model = process.env.LIFEOS_LLM_MODEL?.trim() || "qwen2.5";

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp
        title="Coach"
        subtitle="A voice that has been paying attention. It reads your data, never your journal."
        right={
          <span className="hidden sm:block text-right text-[11px] text-ink-400 leading-snug">
            <span className="block">Model: {model}</span>
            <span className="block text-ink-500">
              {llmHost.replace(/^https?:\/\//, "")}
            </span>
          </span>
        }
      />

      <CoachChat />
    </div>
  );
}
