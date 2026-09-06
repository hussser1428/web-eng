import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { answerQuizWord } from "@/features/vocab/answer-quiz";

const bodySchema = z.object({
  wordId: z.string().min(1),
  chosen: z.string().min(1).max(500),
  direction: z.enum(["EN_TO_VI", "VI_TO_EN"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  try {
    const r = await answerQuizWord(prisma, { userId: session.user.id, ...parsed.data });
    return NextResponse.json({
      isCorrect: r.isCorrect,
      correctText: r.correctText,
      dueAt: r.dueAt.toISOString(),
    });
  } catch (e) {
    const r = errorToResponse(e);
    if (r) return r;
    throw e;
  }
}
