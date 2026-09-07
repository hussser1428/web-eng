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

type ReadingRow = {
  id: string;
  title: string;
  genre: ReadingGenre;
  level: ReadingLevel;
  sourceName: string;
  sourceUrl: string | null;
  license: string;
  wordCount: number;
  sentences: Array<{ order: number; paragraphIndex: number; en: string; vi: string }>;
};

/** Thuần: đổi một dòng Reading (kèm `sentences`) thành DTO cho client. */
export function toReadingForClient(row: ReadingRow): ReadingForClient {
  return {
    id: row.id,
    title: row.title,
    genre: row.genre,
    level: row.level,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    license: row.license,
    wordCount: row.wordCount,
    paragraphs: groupParagraphs(row.sentences),
  };
}

export async function getReading(db: GetReadingDb, id: string): Promise<ReadingForClient | null> {
  const reading = await db.reading.findFirst({
    where: { id, status: "PUBLISHED" },
    include: { sentences: { orderBy: { order: "asc" } } },
  });
  return reading ? toReadingForClient(reading) : null;
}
