import type { PrismaClient } from "@prisma/client";

export type RemoveDb = Pick<PrismaClient, "userWord">;

/** Xoá một từ khỏi sổ tay. Dùng deleteMany kèm userId để không xoá nhầm từ của người khác. */
export async function removeUserWord(db: RemoveDb, p: { userId: string; wordId: string }): Promise<{ removed: boolean }> {
  const r = await db.userWord.deleteMany({ where: { userId: p.userId, wordId: p.wordId } });
  return { removed: r.count > 0 };
}
