import type { PrismaClient } from "@prisma/client";

export type PickDueDb = Pick<PrismaClient, "userWord">;

/** Số thẻ tối đa của một phiên ôn — đủ ngắn để không nản. */
export const SESSION_SIZE = 20;

export type DueWord = {
  wordId: string;
  headword: string;
  phonetic: string | null;
  pos: string | null;
  meaningVi: string;
  exampleEn: string | null;
  exampleVi: string | null;
  sourceContext: string | null;
};

const SELECT = {
  wordId: true,
  sourceContext: true,
  word: { select: { headword: true, phonetic: true, pos: true, meaningVi: true, exampleEn: true, exampleVi: true } },
} as const;

type Row = {
  wordId: string;
  sourceContext: string | null;
  word: { headword: string; phonetic: string | null; pos: string | null; meaningVi: string; exampleEn: string | null; exampleVi: string | null };
};

function toDueWord(r: Row): DueWord {
  return { wordId: r.wordId, sourceContext: r.sourceContext, ...r.word };
}

/**
 * Chọn thẻ cho một phiên ôn.
 * Hết từ đến hạn thì vẫn trả về các từ sắp đến hạn kèm `early: true`; người dùng
 * được ôn sớm, và `review-word.ts` lo phần không để lịch bị đẩy ra xa thêm.
 */
export async function pickDueWords(
  db: PickDueDb,
  p: { userId: string; now?: Date; limit?: number },
): Promise<{ early: boolean; words: DueWord[] }> {
  const now = p.now ?? new Date();
  const take = p.limit ?? SESSION_SIZE;

  const due: Row[] = await db.userWord.findMany({
    where: { userId: p.userId, dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
    take,
    select: SELECT,
  });
  if (due.length > 0) return { early: false, words: due.map(toDueWord) };

  const soon: Row[] = await db.userWord.findMany({
    where: { userId: p.userId },
    orderBy: { dueAt: "asc" },
    take,
    select: SELECT,
  });
  return { early: true, words: soon.map(toDueWord) };
}
