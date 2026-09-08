import type { PrismaClient, ReadingGenre, ReadingLevel } from "@prisma/client";
import type { LlmProvider } from "@/lib/providers/llm/types";
import { importReading } from "@/features/reading/import-reading";
import { readingFileSchema } from "@/features/reading/import-schema";
import { askLlmJson, errorCode } from "./llm-json";
import { buildReadingPrompt, type ReadingLength } from "./prompts/reading";

export type GenerateReadingDb = Pick<PrismaClient, "generationJob" | "reading" | "readingSentence">;

export type GenerateReadingInput = {
  genre: ReadingGenre;
  level: ReadingLevel;
  length: ReadingLength;
  topic?: string;
  createdById: string;
};

export type GenerateReadingResult = {
  jobId: string;
  status: "DONE" | "FAILED";
  readingId?: string;
  title?: string;
  error?: string;
};

/**
 * Sinh một bài đọc song ngữ bằng LLM rồi nhập dưới dạng nháp (`DRAFT`, `source: "AI"`).
 * Không tin kết quả model: qua Zod, ép `genre`/`level` theo input, tái dùng đúng đường nhập file.
 */
export async function generateReading(
  db: GenerateReadingDb,
  llm: LlmProvider,
  input: GenerateReadingInput,
  deps: { now?: () => Date } = {},
): Promise<GenerateReadingResult> {
  const now = deps.now ?? (() => new Date());

  const job = await db.generationJob.create({
    data: {
      type: "reading",
      status: "RUNNING",
      createdById: input.createdById,
      params: {
        genre: input.genre,
        level: input.level,
        length: input.length,
        topic: input.topic ?? null,
      },
    },
  });

  try {
    const prompt = buildReadingPrompt(input);
    const data = await askLlmJson(llm, prompt, readingFileSchema);

    // Model hay trả thể loại/độ khó khác yêu cầu; bộ lọc ở trang bài đọc dựa vào hai trường này.
    data.genre = input.genre;
    data.level = input.level;

    const imported = await importReading(db, data, { publish: false, source: "AI" });
    await db.generationJob.update({
      where: { id: job.id },
      data: { status: "DONE", resultCount: imported.sentences, finishedAt: now() },
    });
    return { jobId: job.id, status: "DONE", readingId: imported.readingId, title: data.title };
  } catch (e) {
    // `errorCode` nuốt mất 401/mạng/abort; log nguyên lỗi để còn tra được trên server.
    console.error("generateReading", e);
    const error = errorCode(e);
    await db.generationJob.update({ where: { id: job.id }, data: { status: "FAILED", error, finishedAt: now() } });
    return { jobId: job.id, status: "FAILED", error };
  }
}
