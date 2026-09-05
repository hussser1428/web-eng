import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { startExam } from "@/features/attempts/start-exam";

export async function POST(_req: Request, { params }: { params: Promise<{ examId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { examId } = await params;
  try {
    return NextResponse.json(await startExam(prisma, { userId: session.user.id, examId }));
  } catch (e) {
    const r = errorToResponse(e);
    if (r) return r;
    throw e;
  }
}
