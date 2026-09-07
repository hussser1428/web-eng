import type { z } from "zod";
import type { LlmProvider } from "@/lib/providers/llm/types";

/** Ghi chú gửi lại cho model ở lần thử thứ hai (tiếng Anh, vì người đọc là model). */
function retryNote(reason: string): string {
  return `\n\nPrevious JSON was invalid: ${reason}. Fix it and return the corrected JSON object only.`;
}

/**
 * Hỏi LLM một object JSON đúng `schema`. Sai định dạng thì thử lại đúng một lần kèm ghi chú lỗi,
 * hỏng lần hai thì ném `Error("LLM_BAD_JSON")`. Lỗi khác (hết hạn mức, dịch vụ hỏng) ném thẳng ra, không thử lại.
 */
export async function askLlmJson<T>(
  llm: LlmProvider,
  prompt: { system: string; user: string },
  schema: z.ZodType<T>,
): Promise<T> {
  let note = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: unknown;
    try {
      raw = await llm.generateJson({ system: prompt.system, user: prompt.user + note });
    } catch (e) {
      if (!(e instanceof Error) || e.message !== "LLM_BAD_JSON") throw e; // hết hạn mức hoặc dịch vụ hỏng: không thử lại
      note = retryNote("the response was not valid JSON");
      continue;
    }
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    note = retryNote(parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  throw new Error("LLM_BAD_JSON");
}
