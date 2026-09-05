import type { Attempt, PrismaClient } from "@prisma/client";

/** Nạp attempt, kiểm tra thuộc đúng người dùng. */
export async function loadOwnedAttempt(db: Pick<PrismaClient, "attempt">, attemptId: string, userId: string): Promise<Attempt> {
  const attempt = await db.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new Error("NOT_FOUND");
  if (attempt.userId !== userId) throw new Error("FORBIDDEN");
  return attempt;
}
