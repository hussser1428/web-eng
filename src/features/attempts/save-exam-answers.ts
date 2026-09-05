import type { PrismaClient } from "@prisma/client";
import { loadOwnedAttempt } from "./load-owned";

export type SaveAnswersDb = Pick<PrismaClient, "attempt" | "attemptAnswer">;

export type SaveAnswersParams = { attemptId: string; userId: string; answers: { questionId: string; chosen: number | null }[] };

/** Đồng bộ đáp án thi (gọi định kỳ và trước khi nộp). Không chấm ở đây; chấm khi nộp. */
export async function saveExamAnswers(db: SaveAnswersDb, p: SaveAnswersParams): Promise<{ saved: number }> {
  const attempt = await loadOwnedAttempt(db, p.attemptId, p.userId);
  if (attempt.type !== "EXAM") throw new Error("WRONG_TYPE");
  if (attempt.submittedAt) throw new Error("ALREADY_SUBMITTED");

  let saved = 0;
  for (const a of p.answers) {
    const r = await db.attemptAnswer.updateMany({ where: { attemptId: p.attemptId, questionId: a.questionId }, data: { chosen: a.chosen } });
    saved += r.count;
  }
  return { saved };
}
