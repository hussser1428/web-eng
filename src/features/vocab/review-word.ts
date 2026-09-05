import type { PrismaClient } from "@prisma/client";
import { reviewSm2, addDays } from "./sm2";

export type ReviewDb = Pick<PrismaClient, "userWord">;

export type ReviewResult = { intervalDays: number; dueAt: Date; early: boolean };

/**
 * Chấm một thẻ rồi hẹn lại lịch ôn.
 *
 * Ôn sớm (mốc `dueAt` cũ còn ở tương lai) thì lấy mốc sớm hơn giữa lịch cũ và
 * lịch vừa tính: trả lời đúng không đẩy lịch đi xa thêm, còn trả lời sai vẫn
 * kéo được từ về ngày mai.
 */
export async function reviewWord(
  db: ReviewDb,
  p: { userId: string; wordId: string; quality: number; now?: Date },
): Promise<ReviewResult> {
  const now = p.now ?? new Date();
  const row = await db.userWord.findUnique({
    where: { userId_wordId: { userId: p.userId, wordId: p.wordId } },
    select: { id: true, easeFactor: true, intervalDays: true, repetitions: true, dueAt: true },
  });
  if (!row) throw new Error("NOT_FOUND");

  const next = reviewSm2(
    { easeFactor: row.easeFactor, intervalDays: row.intervalDays, repetitions: row.repetitions },
    p.quality,
  );
  const tinhDuoc = addDays(now, next.intervalDays);
  const early = row.dueAt.getTime() > now.getTime();
  const dueAt = early && row.dueAt.getTime() < tinhDuoc.getTime() ? row.dueAt : tinhDuoc;

  await db.userWord.update({ where: { id: row.id }, data: { ...next, dueAt } });
  return { intervalDays: next.intervalDays, dueAt, early };
}
