import type { PrismaClient, QuestionSource } from "@prisma/client";
import { flattenParagraphs } from "./flatten";
import type { ReadingFile } from "./import-schema";

export type ImportReadingDb = Pick<PrismaClient, "reading" | "readingSentence">;

export type ImportReadingResult = { readingId: string; sentences: number };

export async function importReading(
  db: ImportReadingDb,
  data: ReadingFile,
  opts: { publish: boolean; source?: QuestionSource },
): Promise<ImportReadingResult> {
  const status = opts.publish ? "PUBLISHED" : "DRAFT";
  const { rows, wordCount } = flattenParagraphs(data.paragraphs);

  const reading = await db.reading.create({
    data: {
      title: data.title,
      genre: data.genre,
      level: data.level,
      sourceName: data.sourceName,
      sourceUrl: data.sourceUrl,
      license: data.license,
      status,
      source: opts.source ?? "IMPORT",
      wordCount,
    },
  });

  await db.readingSentence.createMany({
    data: rows.map((s) => ({ readingId: reading.id, ...s })),
  });

  return { readingId: reading.id, sentences: rows.length };
}
