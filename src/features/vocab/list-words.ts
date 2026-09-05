import type { PrismaClient } from "@prisma/client";

export type ListDb = Pick<PrismaClient, "userWord">;

/** Số từ hiện trên một trang danh sách. */
export const PAGE_SIZE = 20;

export type SavedWord = {
  wordId: string;
  headword: string;
  phonetic: string | null;
  pos: string | null;
  meaningVi: string;
  sourceContext: string | null;
  dueAt: Date;
  createdAt: Date;
};

export type WordPage = { items: SavedWord[]; total: number; page: number; pageSize: number };

type Row = {
  wordId: string;
  sourceContext: string | null;
  dueAt: Date;
  createdAt: Date;
  word: { headword: string; phonetic: string | null; pos: string | null; meaningVi: string };
};

/** Danh sách từ đã lưu, mới nhất trước; `q` tìm đồng thời trong từ và trong nghĩa. */
export async function listUserWords(
  db: ListDb,
  p: { userId: string; q?: string; page?: number; pageSize?: number },
): Promise<WordPage> {
  const q = p.q?.trim() ?? "";
  const pageSize = p.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, Math.floor(p.page ?? 1));
  const where = {
    userId: p.userId,
    ...(q
      ? {
          word: {
            OR: [
              { headword: { contains: q, mode: "insensitive" as const } },
              { meaningVi: { contains: q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.userWord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        wordId: true,
        sourceContext: true,
        dueAt: true,
        createdAt: true,
        word: { select: { headword: true, phonetic: true, pos: true, meaningVi: true } },
      },
    }) as Promise<Row[]>,
    db.userWord.count({ where }),
  ]);

  const items: SavedWord[] = rows.map((r) => ({
    wordId: r.wordId,
    sourceContext: r.sourceContext,
    dueAt: r.dueAt,
    createdAt: r.createdAt,
    ...r.word,
  }));
  return { items, total, page, pageSize };
}
