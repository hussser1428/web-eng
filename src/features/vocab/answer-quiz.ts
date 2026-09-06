import type { PrismaClient } from "@prisma/client";
import { QUALITY } from "./sm2";
import { reviewWord } from "./review-word";
import type { Direction } from "./start-session";

export type AnswerQuizDb = Pick<PrismaClient, "userWord" | "word">;

export type QuizAnswerResult = { isCorrect: boolean; correctText: string; dueAt: Date };

/**
 * Chấm một câu trắc nghiệm rồi cập nhật SM-2.
 * Server tự tra từ rồi so chuỗi người dùng chọn với nghĩa/từ thật, nên không
 * cần nhớ phiên và client cũng không bao giờ cầm sẵn đáp án.
 */
export async function answerQuizWord(
  db: AnswerQuizDb,
  p: { userId: string; wordId: string; chosen: string; direction: Direction; now?: Date },
): Promise<QuizAnswerResult> {
  const word = await db.word.findUnique({ where: { id: p.wordId }, select: { headword: true, meaningVi: true } });
  if (!word) throw new Error("NOT_FOUND");

  const correctText = p.direction === "EN_TO_VI" ? word.meaningVi : word.headword;
  const isCorrect = p.chosen === correctText;
  const r = await reviewWord(db, {
    userId: p.userId,
    wordId: p.wordId,
    quality: isCorrect ? QUALITY.QUIZ_CORRECT : QUALITY.QUIZ_WRONG,
    now: p.now,
  });

  return { isCorrect, correctText, dueAt: r.dueAt };
}
