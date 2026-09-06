import type { PrismaClient, Question, QuestionGroup } from "@prisma/client";

export type GetQuestionDb = Pick<PrismaClient, "question">;

/** Một câu hỏi kèm nhóm của nó, cho trang sửa của admin. Trả `null` nếu không có. */
export async function getQuestion(
  db: GetQuestionDb,
  id: string,
): Promise<(Question & { group: QuestionGroup | null }) | null> {
  return db.question.findUnique({ where: { id }, include: { group: true } });
}
