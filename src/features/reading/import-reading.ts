import type { PrismaClient, QuestionSource } from "@prisma/client";
import type { ReadingFile } from "./import-schema";

export type ImportReadingDb = Pick<PrismaClient, "reading" | "readingSentence">;

export type ImportReadingResult = { readingId: string; sentences: number };

export async function importReading(
  db: ImportReadingDb,
  data: ReadingFile,
  opts: { publish: boolean; source?: QuestionSource },
): Promise<ImportReadingResult> {
  const status = opts.publish ? "PUBLISHED" : "DRAFT";

  const rows = data.paragraphs.flatMap((paragraph, paragraphIndex) =>
    paragraph.map((s) => ({ ...s, paragraphIndex })),
  );
  const wordCount = rows.reduce((sum, s) => sum + s.en.split(/\s+/).filter(Boolean).length, 0);

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
    data: rows.map((s, i) => ({
      readingId: reading.id,
      order: i + 1,
      paragraphIndex: s.paragraphIndex,
      en: s.en,
      vi: s.vi,
    })),
  });

  return { readingId: reading.id, sentences: rows.length };
}
