import { requireUserContext } from "@/lib/auth/server-helpers";
import { CoachChat } from "@/components/coach/CoachChat";
import { PageStamp } from "@/components/PageStamp";
import { llmConfig, llmHost } from "@/lib/coach/llm";

export default async function CoachPage() {
  await requireUserContext();
  const host = llmHost();
  const { defaultModel } = llmConfig();

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp
        title="Coach"
        subtitle="A voice that has been paying attention. It reads your data, never your journal."
        right={
          <span className="hidden sm:block text-right text-[11px] text-ink-400 leading-snug">
            <span className="block">Model server</span>
            <span className="block text-ink-500">{host}</span>
          </span>
        }
      />

      <CoachChat defaultModel={defaultModel} host={host} />
    </div>
  );
}
