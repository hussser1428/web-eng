import type { PrismaClient } from "@prisma/client";
import { getCertificate, getSection } from "@/features/certificates";
import { pickDrillQuestions } from "@/features/drill/pick-questions";

export type StartDrillDb = Pick<PrismaClient, "question" | "attemptAnswer" | "attempt">;

export type StartDrillParams = { userId: string; certificate: string; section: string; skillTags?: string[]; count: number };

export async function startDrill(db: StartDrillDb, p: StartDrillParams): Promise<{ attemptId: string; count: number }> {
  const cert = getCertificate(p.certificate);
  if (!getSection(cert, p.section)) throw new Error("INVALID");

  const ids = await pickDrillQuestions(db, { userId: p.userId, certificate: cert.id, section: p.section, skillTags: p.skillTags, count: p.count });

  const attempt = await db.attempt.create({
    data: { userId: p.userId, certificate: cert.id, type: "DRILL", config: { section: p.section, skillTags: p.skillTags ?? [], count: ids.length } },
  });
  await db.attemptAnswer.createMany({ data: ids.map((questionId, i) => ({ attemptId: attempt.id, questionId, order: i + 1 })) });
  return { attemptId: attempt.id, count: ids.length };
}
