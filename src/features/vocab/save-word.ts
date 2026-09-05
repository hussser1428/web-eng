import type { PrismaClient } from "@prisma/client";

export async function saveWord(
  db: Pick<PrismaClient, "userWord">,
  input: { userId: string; wordId: string; sourceContext?: string }
): Promise<{ created: boolean }> {
  const before = await db.userWord.findUnique({
    where: { userId_wordId: { userId: input.userId, wordId: input.wordId } },
    select: { id: true },
  });
  await db.userWord.upsert({
    where: { userId_wordId: { userId: input.userId, wordId: input.wordId } },
    update: {},
    create: {
      userId: input.userId,
      wordId: input.wordId,
      sourceContext: input.sourceContext?.slice(0, 300) ?? null,
    },
  });
  return { created: before === null };
}
