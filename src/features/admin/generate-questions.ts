import type { PrismaClient } from "@prisma/client";
import type { LlmProvider } from "@/lib/providers/llm/types";
import { importQuestions } from "@/features/questions/import-questions";
import { questionFileSchema, type QuestionFile } from "@/features/questions/import-schema";
import { MAX_COUNT } from "./prompts/limits";
import { buildPrompt, type PromptSection } from "./prompts";

export type GenerateDb = Pick<PrismaClient, "generationJob" | "questionGroup" | "question" | "exam" | "examQuestion">;

export type GenerateInput = {
  section: string;
  count: number;
  skillTag?: string;
  createdById: string;
  certificate?: string;
};

export type GenerateResult = {
  jobId: string;
  status: "DONE" | "FAILED";
  resultCount: number;
  error?: string;
};

export { MAX_COUNT };

/** Mã lỗi để ghi vào `GenerationJob.error`; lỗi lạ thì gộp thành `LLM_UNAVAILABLE`. */
function errorCode(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  return /^[A-Z_]+(:.*)?$/.test(m) ? m : "LLM_UNAVAILABLE";
}

/** Ghi chú gửi lại cho model ở lần thử thứ hai (tiếng Anh, vì người đọc là model). */
function retryNote(reason: string): string {
  return `\n\nPrevious JSON was invalid: ${reason}. Fix it and return the corrected JSON object only.`;
}

/**
 * Sinh câu hỏi Part 5–7 bằng LLM rồi nhập vào kho dưới dạng nháp (`DRAFT`, `source: "AI"`).
 * Không tin kết quả model: luôn qua Zod, ép `certificate`/`section` theo input, thử lại đúng một lần khi JSON sai.
 */
export async function generateQuestions(
  db: GenerateDb,
  llm: LlmProvider,
  input: GenerateInput,
  deps: { now?: () => Date } = {},
): Promise<GenerateResult> {
  const now = deps.now ?? (() => new Date());
  const count = Math.max(1, Math.min(MAX_COUNT, Math.floor(input.count) || 1));
  const certificate = input.certificate ?? "toeic";

  const job = await db.generationJob.create({
    data: {
      type: "questions",
      status: "RUNNING",
      createdById: input.createdById,
      params: { certificate, section: input.section, count, skillTag: input.skillTag ?? null },
    },
  });

  try {
    // `buildPrompt` ném UNSUPPORTED_SECTION với Part chưa hỗ trợ
    const prompt = buildPrompt(input.section as PromptSection, { count, skillTag: input.skillTag });

    let data: QuestionFile | null = null;
    let note = "";
    for (let attempt = 0; attempt < 2 && !data; attempt++) {
      let raw: unknown;
      try {
        raw = await llm.generateJson({ system: prompt.system, user: prompt.user + note });
      } catch (e) {
        if (errorCode(e) !== "LLM_BAD_JSON") throw e; // hết hạn mức hoặc dịch vụ hỏng: không thử lại
        note = retryNote("the response was not valid JSON");
        continue;
      }
      const parsed = questionFileSchema.safeParse(raw);
      if (parsed.success) data = parsed.data;
      else note = retryNote(parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    }

    if (!data) throw new Error("LLM_BAD_JSON");

    // Không tin section/certificate model trả về
    data.certificate = certificate;
    for (const g of data.groups) g.section = input.section;
    for (const q of data.questions) q.section = input.section;

    const imported = await importQuestions(db, data, { publish: false, source: "AI" });
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: "DONE", resultCount: imported.questions, finishedAt: now() },
    });
    return { jobId: job.id, status: "DONE", resultCount: imported.questions };
  } catch (e) {
    // `errorCode` nuốt mất 401/mạng/abort; log nguyên lỗi để còn tra được trên server.
    console.error("generateQuestions", e);
    const error = errorCode(e);
    await db.generationJob.update({ where: { id: job.id }, data: { status: "FAILED", error, finishedAt: now() } });
    return { jobId: job.id, status: "FAILED", resultCount: 0, error };
  }
}
