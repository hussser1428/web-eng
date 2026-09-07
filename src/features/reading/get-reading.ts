import type { PrismaClient, ReadingGenre, ReadingLevel } from "@prisma/client";

export type GetReadingDb = Pick<PrismaClient, "reading">;

export type SentenceForClient = { order: number; en: string; vi: string };

export type ReadingForClient = {
  id: string;
  title: string;
  genre: ReadingGenre;
  level: ReadingLevel;
  sourceName: string;
  sourceUrl: string | null;
  license: string;
  wordCount: number;
  paragraphs: SentenceForClient[][];
};

/** Thuần: gộp câu (đã sắp theo order) thành mảng đoạn theo paragraphIndex. */
export function groupParagraphs(
  rows: Array<{ order: number; paragraphIndex: number; en: string; vi: string }>,
): SentenceForClient[][] {
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  const byParagraph = new Map<number, SentenceForClient[]>();
  for (const r of sorted) {
    const sentences = byParagraph.get(r.paragraphIndex) ?? [];
    sentences.push({ order: r.order, en: r.en, vi: r.vi });
    byParagraph.set(r.paragraphIndex, sentences);
  }
  return [...byParagraph.entries()].sort((a, b) => a[0] - b[0]).map(([, sentences]) => sentences);
}

export async function getReading(db: GetReadingDb, id: string): Promise<ReadingForClient | null> {
  const reading = await db.reading.findFirst({
    where: { id, status: "PUBLISHED" },
    include: { sentences: { orderBy: { order: "asc" } } },
  });
  if (!reading) return null;

  return {
    id: reading.id,
    title: reading.title,
    genre: reading.genre,
    level: reading.level,
    sourceName: reading.sourceName,
    sourceUrl: reading.sourceUrl,
    license: reading.license,
    wordCount: reading.wordCount,
    paragraphs: groupParagraphs(reading.sentences),
  };
}
