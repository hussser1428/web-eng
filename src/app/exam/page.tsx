import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Thi thử" };

export default async function ExamListPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const exams = await prisma.exam.findMany({
    where: { certificate: "toeic", status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">🎯 Thi thử TOEIC</h1>
        <p className="mt-2 text-muted">Làm bài như thi thật: audio phát một lần, phần đọc 75 phút, nộp bài xem điểm ước tính.</p>
      </header>
      {exams.length === 0 ? (
        <p className="card p-6 text-muted">Chưa có đề nào được đăng.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((e) => (
            <li key={e.id}>
              <Link href={`/exam/${e.id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:border-neon-violet/60">
                <h2 className="text-lg font-bold">{e.title}</h2>
                <p className="mt-1 text-sm text-muted">{e._count.questions} câu{e._count.questions < 200 ? " · đề rút gọn" : ""}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
