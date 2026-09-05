import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { saveExamAnswers } from "@/features/attempts/save-exam-answers";
import { submitAttempt } from "@/features/attempts/submit";

const bodySchema = z.object({
  answers: z.array(z.object({ questionId: z.string().min(1), chosen: z.number().int().min(0).max(3).nullable() })).max(300).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const raw = await req.text();
  let body: unknown = {};
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "INVALID" }, { status: 400 });
    }
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const { attemptId } = await params;
  const userId = session.user.id;
  try {
    if (parsed.data.answers) await saveExamAnswers(prisma, { attemptId, userId, answers: parsed.data.answers });
    return NextResponse.json(await submitAttempt(prisma, { attemptId, userId }));
  } catch (e) {
    const r = errorToResponse(e);
    if (r) return r;
    throw e;
  }
}
