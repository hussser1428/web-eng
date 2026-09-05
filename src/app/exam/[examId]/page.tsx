import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOEIC } from "@/features/certificates";
import { ExamStartButton } from "@/components/exam/ExamStartButton";

export const metadata: Metadata = { title: "Giới thiệu đề" };

export default async function ExamIntroPage({ params }: { params: Promise<{ examId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { examId } = await params;
  const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { questions: { select: { question: { select: { section: true } } } } } });
  if (!exam || exam.status !== "PUBLISHED") notFound();

  const countBySection = new Map<string, number>();
  for (const eq of exam.questions) countBySection.set(eq.question.section, (countBySection.get(eq.question.section) ?? 0) + 1);
  const hasListening = TOEIC.sections.some((s) => s.skill === "listening" && countBySection.has(s.id));

  const previous = await prisma.attempt.findMany({
    where: { userId: session.user.id, examId, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
    take: 5,
    select: { id: true, submittedAt: true, scores: true },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted">{TOEIC.name}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{exam.title}</h1>
      </header>
      <section className="card p-6">
        <h2 className="font-bold">Cấu trúc đề</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {TOEIC.sections.filter((s) => countBySection.has(s.id)).map((s) => (
            <li key={s.id} className="flex justify-between py-2"><span>{s.name}</span><span className="text-muted">{countBySection.get(s.id)} câu</span></li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          {hasListening ? `Phần nghe: audio phát một lần, không tua. Sau đó phần đọc ${TOEIC.timeLimits.reading} phút.` : `Đề này chỉ có phần đọc: ${TOEIC.timeLimits.reading} phút, hết giờ tự nộp.`}
          {" "}Popup dịch bị tắt trong lúc làm bài.
        </p>
        <div className="mt-6"><ExamStartButton examId={exam.id} /></div>
      </section>
      {previous.length > 0 && (
        <section className="card p-6">
          <h2 className="font-bold">Lần làm trước</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {previous.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span className="text-muted">{a.submittedAt?.toLocaleString("vi-VN")}</span>
                <span className="font-semibold text-neon">{(a.scores as { total?: number } | null)?.total ?? "—"} điểm</span>
                <Link href={`/attempts/${a.id}/result`} className="text-neon-cyan hover:underline">Xem</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
