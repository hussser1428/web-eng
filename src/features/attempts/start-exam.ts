import type { PrismaClient } from "@prisma/client";

export type StartExamDb = Pick<PrismaClient, "exam" | "examQuestion" | "attempt" | "attemptAnswer">;

export async function startExam(db: StartExamDb, p: { userId: string; examId: string }): Promise<{ attemptId: string }> {
  const exam = await db.exam.findUnique({ where: { id: p.examId } });
  if (!exam || exam.status !== "PUBLISHED") throw new Error("NOT_FOUND");

  const items = await db.examQuestion.findMany({ where: { examId: exam.id }, orderBy: { order: "asc" }, select: { questionId: true, order: true } });
  const attempt = await db.attempt.create({ data: { userId: p.userId, certificate: exam.certificate, type: "EXAM", examId: exam.id } });
  await db.attemptAnswer.createMany({ data: items.map((it) => ({ attemptId: attempt.id, questionId: it.questionId, order: it.order })) });
  return { attemptId: attempt.id };
}
