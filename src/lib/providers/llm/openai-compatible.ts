import type { LlmProvider } from "./types";

/** Model đôi khi vẫn bọc JSON trong rào markdown dù đã bật json_object. */
function stripFence(content: string): string {
  const m = content.trim().match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return (m ? m[1] : content).trim();
}

export function createOpenAiCompatible(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}): LlmProvider {
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 60000;
  const base = opts.baseUrl.replace(/\/$/, "");

  return {
    async generateJson({ system, user, maxTokens }): Promise<unknown> {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetchFn(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${opts.apiKey}`,
          },
          body: JSON.stringify({
            model: opts.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            ...(maxTokens === undefined ? {} : { max_tokens: maxTokens }),
          }),
          signal: ctrl.signal,
        });
        if (res.status === 429) throw new Error("LLM_RATE_LIMITED");
        if (!res.ok) throw new Error("LLM_UNAVAILABLE", { cause: new Error(`HTTP ${res.status}`) });

        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("LLM_UNAVAILABLE");

        try {
          return JSON.parse(stripFence(content));
        } catch (e) {
          throw new Error("LLM_BAD_JSON", { cause: e });
        }
      } catch (e) {
        if (e instanceof Error && ["LLM_RATE_LIMITED", "LLM_BAD_JSON", "LLM_UNAVAILABLE"].includes(e.message)) throw e;
        throw new Error("LLM_UNAVAILABLE", { cause: e });
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
