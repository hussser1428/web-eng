import type { PrismaClient } from "@prisma/client";
import { getCertificate, type ScoreResult } from "@/features/certificates";
import { toClientQuestion, type QuestionForClient } from "@/features/questions/dto";
import { loadOwnedAttempt } from "./load-owned";

export type ResultDb = Pick<PrismaClient, "attempt" | "attemptAnswer">;

export type ResultQuestion = QuestionForClient & { answer: number; explanation: string; isCorrect: boolean | null };

export type AttemptResult = {
  id: string;
  type: "EXAM" | "DRILL";
  certificate: string;
  examId: string | null;
  startedAt: string;
  submittedAt: string;
  overtime: boolean;
  scores: ScoreResult | null;
  correct: number;
  total: number;
  bySection: { section: string; name: string; correct: number; total: number }[];
  questions: ResultQuestion[];
};

export async function getAttemptResult(db: ResultDb, p: { attemptId: string; userId: string }): Promise<AttemptResult> {
  const attempt = await loadOwnedAttempt(db, p.attemptId, p.userId);
  if (!attempt.submittedAt) throw new Error("NOT_SUBMITTED");
  const cert = getCertificate(attempt.certificate);

  const rows = await db.attemptAnswer.findMany({
    where: { attemptId: attempt.id },
    orderBy: { order: "asc" },
    include: { question: { include: { group: true } } },
  });

  const bySectionMap = new Map<string, { correct: number; total: number }>();
  let correct = 0;
  const questions: ResultQuestion[] = rows.map((r) => {
    const s = bySectionMap.get(r.question.section) ?? { correct: 0, total: 0 };
    s.total++;
    if (r.isCorrect) {
      s.correct++;
      correct++;
    }
    bySectionMap.set(r.question.section, s);
    return { ...toClientQuestion(r.question, r.order, r.chosen), answer: r.question.answer, explanation: r.question.explanation, isCorrect: r.isCorrect };
  });

  const bySection = cert.sections
    .filter((s) => bySectionMap.has(s.id))
    .map((s) => ({ section: s.id, name: s.name, ...bySectionMap.get(s.id)! }));

  return {
    id: attempt.id,
    type: attempt.type,
    certificate: attempt.certificate,
    examId: attempt.examId,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt.toISOString(),
    overtime: attempt.overtime,
    scores: (attempt.scores as ScoreResult | null) ?? null,
    correct,
    total: rows.length,
    bySection,
    questions,
  };
}
