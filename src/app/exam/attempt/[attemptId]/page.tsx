import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttemptForUser, type AttemptForClient } from "@/features/attempts/get-attempt";
import { getCertificate } from "@/features/certificates";
import { ExamRunner } from "@/components/exam/ExamRunner";

export const metadata: Metadata = { title: "Đang làm bài" };

export default async function ExamAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
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
  if (attempt.type !== "EXAM") redirect(`/drill/${attempt.id}`);
  if (attempt.submittedAt) redirect(`/attempts/${attempt.id}/result`);

  const cert = getCertificate(attempt.certificate);
  return <ExamRunner attempt={attempt} sections={cert.sections} timeLimits={cert.timeLimits} />;
}
