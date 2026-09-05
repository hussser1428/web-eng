import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttemptResult, type AttemptResult } from "@/features/attempts/get-result";
import { ResultView } from "@/components/exam/ResultView";

export const metadata: Metadata = { title: "Kết quả" };

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { attemptId } = await params;

  let result: AttemptResult;
  try {
    result = await getAttemptResult(prisma, { attemptId, userId: session.user.id });
  } catch (e) {
    if (e instanceof Error && (e.message === "NOT_FOUND" || e.message === "FORBIDDEN")) notFound();
    if (e instanceof Error && e.message === "NOT_SUBMITTED") {
      const a = await prisma.attempt.findUnique({ where: { id: attemptId }, select: { type: true } });
      redirect(a?.type === "EXAM" ? `/exam/attempt/${attemptId}` : `/drill/${attemptId}`);
    }
    throw e;
  }
  return <ResultView result={result} />;
}
