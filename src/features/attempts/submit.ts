import type { PrismaClient } from "@prisma/client";
import { getCertificate, type ScoreResult } from "@/features/certificates";
import { loadOwnedAttempt } from "./load-owned";

export type SubmitDb = Pick<PrismaClient, "attempt" | "attemptAnswer">;

export type SubmitResult = { correct: number; total: number; scores: ScoreResult | null; overtime: boolean };

const GRACE_MINUTES = 2;

export async function submitAttempt(db: SubmitDb, p: { attemptId: string; userId: string; now?: Date }): Promise<SubmitResult> {
  const now = p.now ?? new Date();
  const attempt = await loadOwnedAttempt(db, p.attemptId, p.userId);
  if (attempt.submittedAt) throw new Error("ALREADY_SUBMITTED");

  const rows = await db.attemptAnswer.findMany({
    where: { attemptId: attempt.id },
    include: { question: { select: { answer: true, section: true } } },
  });

  const correctBySection: Record<string, number> = {};
  let correct = 0;
  for (const r of rows) {
    const isCorrect = r.chosen === null ? null : r.chosen === r.question.answer;
    if (isCorrect) {
      correct++;
      correctBySection[r.question.section] = (correctBySection[r.question.section] ?? 0) + 1;
    }
    await db.attemptAnswer.update({ where: { id: r.id }, data: { isCorrect } });
  }

  let scores: ScoreResult | null = null;
  let overtime = false;
  if (attempt.type === "EXAM") {
    const cert = getCertificate(attempt.certificate);
    scores = cert.score(correctBySection);
    const limitMs = (cert.timeLimits.listening + cert.timeLimits.reading + GRACE_MINUTES) * 60_000;
    overtime = now.getTime() - attempt.startedAt.getTime() > limitMs;
  }

  await db.attempt.update({ where: { id: attempt.id }, data: { submittedAt: now, overtime, scores: scores ?? undefined } });
  return { correct, total: rows.length, scores, overtime };
}
