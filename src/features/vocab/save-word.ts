import type { PrismaClient } from "@prisma/client";

export async function saveWord(
  db: Pick<PrismaClient, "userWord">,
  input: { userId: string; wordId: string; sourceContext?: string }
): Promise<{ created: boolean }> {
  const existing = await db.userWord.findUnique({
    where: { userId_wordId: { userId: input.userId, wordId: input.wordId } },
  });
  if (existing) return { created: false };
  await db.userWord.create({
    data: {
      userId: input.userId,
      wordId: input.wordId,
      sourceContext: input.sourceContext?.slice(0, 300) ?? null,
    },
  });
  return { created: true };
}
