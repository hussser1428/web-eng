import type { PrismaClient } from "@prisma/client";

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && e.code === "P2002";
}

export async function saveWord(
  db: Pick<PrismaClient, "userWord">,
  input: { userId: string; wordId: string; sourceContext?: string }
): Promise<{ created: boolean }> {
  const existing = await db.userWord.findUnique({
    where: { userId_wordId: { userId: input.userId, wordId: input.wordId } },
  });
  if (existing) return { created: false };
  try {
    await db.userWord.upsert({
      where: { userId_wordId: { userId: input.userId, wordId: input.wordId } },
      update: {},
      create: {
        userId: input.userId,
        wordId: input.wordId,
        sourceContext: input.sourceContext?.slice(0, 300) ?? null,
      },
    });
    return { created: true };
  } catch (e) {
    if (isUniqueViolation(e)) return { created: false };
    throw e;
  }
}
