import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startVocabSession, type QuizItem } from "@/features/vocab/start-session";
import { QuizSession } from "@/components/vocab/QuizSession";

export const metadata: Metadata = { title: "Trắc nghiệm từ vựng" };

export default async function QuizPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let items: QuizItem[] = [];
  let early = false;
  try {
    const phien = await startVocabSession(prisma, { userId: session.user.id, mode: "QUIZ" });
    if (phien.mode === "QUIZ") {
      items = phien.items;
      early = phien.early;
    }
  } catch (e) {
    // Từ điển chưa đủ từ cùng loại: để QuizSession hiện lời mời ôn thẻ thay vì lỗi 500
    if (!(e instanceof Error && e.message === "NOT_ENOUGH_WORDS")) throw e;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Trắc nghiệm từ vựng</h1>
      <QuizSession items={items} early={early} />
    </div>
  );
}
