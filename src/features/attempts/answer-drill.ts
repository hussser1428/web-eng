import type { PrismaClient } from "@prisma/client";
import { loadOwnedAttempt } from "./load-owned";

export type AnswerDrillDb = Pick<PrismaClient, "attempt" | "attemptAnswer">;

export type AnswerDrillParams = { attemptId: string; userId: string; questionId: string; chosen: number };

export async function answerDrillQuestion(db: AnswerDrillDb, p: AnswerDrillParams): Promise<{ isCorrect: boolean; answer: number; explanation: string }> {
  const attempt = await loadOwnedAttempt(db, p.attemptId, p.userId);
  if (attempt.type !== "DRILL") throw new Error("WRONG_TYPE");
  if (attempt.submittedAt) throw new Error("ALREADY_SUBMITTED");

  const row = await db.attemptAnswer.findUnique({
    where: { attemptId_questionId: { attemptId: p.attemptId, questionId: p.questionId } },
    include: { question: { select: { answer: true, explanation: true, choices: true } } },
  });
  if (!row) throw new Error("NOT_FOUND");
  const choices = row.question.choices as string[];
  if (!Number.isInteger(p.chosen) || p.chosen < 0 || p.chosen >= choices.length) throw new Error("INVALID");

  const isCorrect = row.question.answer === p.chosen;
  await db.attemptAnswer.update({ where: { id: row.id }, data: { chosen: p.chosen, isCorrect } });
  return { isCorrect, answer: row.question.answer, explanation: row.question.explanation };
}
