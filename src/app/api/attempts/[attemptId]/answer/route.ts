import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { answerDrillQuestion } from "@/features/attempts/answer-drill";

const bodySchema = z.object({ questionId: z.string().min(1), chosen: z.number().int().min(0).max(3) });

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const { attemptId } = await params;
  try {
    return NextResponse.json(await answerDrillQuestion(prisma, { attemptId, userId: session.user.id, ...parsed.data }));
  } catch (e) {
    const r = errorToResponse(e);
    if (r) return r;
    throw e;
  }
}
