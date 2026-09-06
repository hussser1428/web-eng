import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getQuestion } from "@/features/admin/get-question";
import { getCertificate, getSection } from "@/features/certificates";
import { QuestionForm } from "@/components/admin/QuestionForm";

export const metadata: Metadata = { title: "Sửa câu hỏi" };

export default async function AdminQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await getQuestion(prisma, id);
  if (!q) notFound();

  const spec = getSection(getCertificate(q.certificate), q.section);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/admin/questions" className="flex w-fit items-center gap-1.5 text-sm text-muted hover:underline">
          <ArrowLeft size={18} aria-hidden="true" />
          Về danh sách câu hỏi
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">Sửa câu hỏi</h1>
        <p className="mt-2 text-muted">
          {spec?.name ?? q.section} — {q.status === "PUBLISHED" ? "đã đăng" : "nháp"}
        </p>
      </header>

      <QuestionForm
        question={{
          id: q.id,
          stem: q.stem,
          choices: q.choices as string[],
          answer: q.answer,
          explanation: q.explanation,
          skillTags: q.skillTags,
          audioUrl: q.audioUrl,
          imageUrl: q.imageUrl,
          transcript: q.transcript,
          group: q.group && { passage: q.group.passage, transcript: q.group.transcript },
        }}
        choiceCount={spec?.choiceCount ?? 4}
      />
    </div>
  );
}
