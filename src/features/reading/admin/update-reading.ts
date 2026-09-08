import type { PrismaClient } from "@prisma/client";
import { flattenParagraphs } from "../flatten";
import type { UpdateReadingInput } from "./update-reading-schema";

export type UpdateReadingDb = Pick<PrismaClient, "reading" | "readingSentence" | "$transaction">;

/**
 * Ghi đè một bài đọc: xoá sạch câu cũ rồi ghi lại toàn bộ trong một transaction, nên `order` luôn
 * liên tục và không có lúc nào bài thiếu câu. Bài không có thì ném NOT_FOUND.
 */
export async function updateReading(db: UpdateReadingDb, id: string, input: UpdateReadingInput): Promise<void> {
  const row = await db.reading.findUnique({ where: { id }, select: { id: true } });
  if (!row) throw new Error("NOT_FOUND");

  const { rows, wordCount } = flattenParagraphs(input.paragraphs);

  await db.$transaction([
    db.readingSentence.deleteMany({ where: { readingId: id } }),
    db.readingSentence.createMany({ data: rows.map((s) => ({ readingId: id, ...s })) }),
    db.reading.update({
      where: { id },
      data: {
        title: input.title,
        genre: input.genre,
        level: input.level,
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl ?? null,
        license: input.license,
        wordCount,
      },
    }),
  ]);
}
