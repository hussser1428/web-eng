import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttemptForUser, type AttemptForClient } from "@/features/attempts/get-attempt";
import { DrillRunner } from "@/components/drill/DrillRunner";

export const metadata: Metadata = { title: "Đang luyện tập" };

export default async function DrillAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { attemptId } = await params;

  let attempt: AttemptForClient;
  try {
    attempt = await getAttemptForUser(prisma, { attemptId, userId: session.user.id });
  } catch (e) {
    if (e instanceof Error && (e.message === "NOT_FOUND" || e.message === "FORBIDDEN")) notFound();
    throw e;
  }
  if (attempt.type !== "DRILL") redirect(`/exam/attempt/${attempt.id}`);
  if (attempt.submittedAt) redirect(`/attempts/${attempt.id}/result`);

  return <DrillRunner attempt={attempt} />;
}
