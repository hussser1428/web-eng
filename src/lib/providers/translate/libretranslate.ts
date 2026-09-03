import type { Lang } from "@/features/translate/direction";
import type { TranslateProvider } from "./types";

export function createLibreTranslate(opts: {
  baseUrl: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}): TranslateProvider {
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 5000;
  const base = opts.baseUrl.replace(/\/$/, "");

  return {
    async translate(text: string, from: Lang, to: Lang): Promise<string> {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetchFn(`${base}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, source: from, target: to, format: "text" }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("TRANSLATE_UNAVAILABLE", { cause: new Error(`HTTP ${res.status}`) });
        const data = (await res.json()) as { translatedText?: string };
        if (typeof data.translatedText !== "string") throw new Error("TRANSLATE_UNAVAILABLE");
        return data.translatedText;
      } catch (e) {
        if (e instanceof Error && e.message === "TRANSLATE_UNAVAILABLE") throw e;
        throw new Error("TRANSLATE_UNAVAILABLE", { cause: e });
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
