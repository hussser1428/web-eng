import { createOpenAiCompatible } from "./openai-compatible";
import type { LlmProvider } from "./types";

let cached: LlmProvider | null = null;

/** `null` khi chưa cấu hình `LLM_API_KEY` — trang sinh câu hỏi báo "Chưa cấu hình LLM". */
export function getLlmProvider(): LlmProvider | null {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  if (!cached) {
    cached = createOpenAiCompatible({
      baseUrl: process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1",
      apiKey,
      model: process.env.LLM_MODEL ?? "llama-3.3-70b-versatile",
      // Phải thấp hơn `maxDuration = 60` của /admin/generate: hết giờ hàm là job kẹt RUNNING mãi.
      timeoutMs: 45_000,
    });
  }
  return cached;
}
