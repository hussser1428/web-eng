import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { reviewWord } from "@/features/vocab/review-word";
import { QUALITY } from "@/features/vocab/sm2";

const bodySchema = z.object({
  wordId: z.string().min(1),
  grade: z.enum(["FORGOT", "HARD", "EASY"]),
});

const CHAT_LUONG = { FORGOT: QUALITY.FORGOT, HARD: QUALITY.HARD, EASY: QUALITY.EASY } as const;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  try {
    const r = await reviewWord(prisma, {
      userId: session.user.id,
      wordId: parsed.data.wordId,
      quality: CHAT_LUONG[parsed.data.grade],
    });
    return NextResponse.json({ dueAt: r.dueAt.toISOString(), intervalDays: r.intervalDays, early: r.early });
  } catch (e) {
    const r = errorToResponse(e);
    if (r) return r;
    throw e;
  }
}
