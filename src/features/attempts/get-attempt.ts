import type { PrismaClient } from "@prisma/client";
import { toClientQuestion, type QuestionForClient } from "@/features/questions/dto";
import { loadOwnedAttempt } from "./load-owned";

export type GetAttemptDb = Pick<PrismaClient, "attempt" | "attemptAnswer">;

export type AttemptConfig = { section?: string; skillTags?: string[]; count?: number };

export type AttemptForClient = {
  id: string;
  type: "EXAM" | "DRILL";
  certificate: string;
  examId: string | null;
  startedAt: string;
  submittedAt: string | null;
  config: AttemptConfig | null;
  questions: QuestionForClient[];
};

export async function getAttemptForUser(db: GetAttemptDb, p: { attemptId: string; userId: string }): Promise<AttemptForClient> {
  const attempt = await loadOwnedAttempt(db, p.attemptId, p.userId);
  const rows = await db.attemptAnswer.findMany({
    where: { attemptId: attempt.id },
    orderBy: { order: "asc" },
    include: { question: { include: { group: true } } },
  });
  return {
    id: attempt.id,
    type: attempt.type,
    certificate: attempt.certificate,
    examId: attempt.examId,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
    config: (attempt.config as AttemptConfig | null) ?? null,
    questions: rows.map((r) => toClientQuestion(r.question, r.order, r.chosen)),
  };
}
