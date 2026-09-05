import type { PrismaClient } from "@prisma/client";

export type CountDb = Pick<PrismaClient, "userWord">;

/** Số từ đang đến hạn ôn và tổng số từ đã lưu. Dùng cho trang /vocab lẫn dashboard. */
export async function countDueWords(db: CountDb, p: { userId: string; now?: Date }): Promise<{ due: number; saved: number }> {
  const now = p.now ?? new Date();
  const [due, saved] = await Promise.all([
    db.userWord.count({ where: { userId: p.userId, dueAt: { lte: now } } }),
    db.userWord.count({ where: { userId: p.userId } }),
  ]);
  return { due, saved };
}
