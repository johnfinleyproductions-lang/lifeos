/**
 * The model server the coach talks to, and what it has on offer.
 *
 * Any OpenAI-compatible server works: Ollama, LM Studio, llama.cpp, vLLM.
 * Which server is a setting (LIFEOS_LLM_BASE_URL). Which model on that
 * server is a choice each person makes on the Coach page, from the list the
 * server itself reports, so a model pulled this afternoon shows up without
 * touching any settings.
 */

const DEFAULT_BASE = "http://localhost:11434/v1";
const DEFAULT_MODEL = "qwen2.5";
const DEFAULT_KEY = "ollama";

/** What a model name may look like: "qwen2.5:32b", "org/model-name". */
export const MODEL_NAME = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/;

export function llmConfig() {
  return {
    baseUrl: (process.env.LIFEOS_LLM_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/+$/, ""),
    apiKey: process.env.LIFEOS_LLM_API_KEY?.trim() || DEFAULT_KEY,
    /** Used until someone picks, and whenever their pick is not on the list. */
    defaultModel: process.env.LIFEOS_LLM_MODEL?.trim() || DEFAULT_MODEL,
  };
}

/** The server's address without the scheme, for showing to people. */
export function llmHost(): string {
  return llmConfig().baseUrl.replace(/^https?:\/\//, "");
}

export type ModelList =
  | { reachable: true; models: string[] }
  | { reachable: false; models: []; reason: string };

/** Models that turn text into vectors cannot hold a conversation. */
const NOT_FOR_CHAT = /embed|bge-|nomic|minilm|rerank|whisper|tts/i;

/** Ask the server what it can run. Never throws; an unreachable server is an answer. */
export async function listModels(): Promise<ModelList> {
  const { baseUrl, apiKey } = llmConfig();
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      return { reachable: false, models: [], reason: `The model server answered ${res.status}.` };
    }
    const body = (await res.json()) as { data?: Array<{ id?: unknown }> };
    const models = (body.data ?? [])
      .map((entry) => (typeof entry.id === "string" ? entry.id : ""))
      .filter((id) => MODEL_NAME.test(id) && !NOT_FOR_CHAT.test(id))
      .sort((a, b) => a.localeCompare(b));
    return { reachable: true, models: [...new Set(models)] };
  } catch {
    return {
      reachable: false,
      models: [],
      reason: `Nothing answered at ${llmHost()}. Is the model server running?`,
    };
  }
}
