import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrainCircuit, Layers, ListChecks } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listUserWords } from "@/features/vocab/list-words";
import { countDueWords } from "@/features/vocab/count-due";
import { VocabList } from "@/components/vocab/VocabList";

export const metadata: Metadata = { title: "Từ vựng" };

export default async function VocabPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const [trang, dem] = await Promise.all([
    listUserWords(prisma, { userId: session.user.id, q: sp.q, page: Number(sp.page) || 1 }),
    countDueWords(prisma, { userId: session.user.id, now }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <BrainCircuit size={26} className="text-accent-text" aria-hidden="true" />
          Từ vựng
        </h1>
        <p className="mt-2 text-muted">
          {dem.saved === 0
            ? "Sổ tay còn trống."
            : dem.due > 0
              ? `Bạn đã lưu ${dem.saved} từ, trong đó ${dem.due} từ đến hạn ôn hôm nay.`
              : `Bạn đã lưu ${dem.saved} từ. Hôm nay không còn từ nào đến hạn.`}
        </p>
      </header>

      {dem.saved > 0 && (
        <div className="flex flex-wrap gap-3">
          <Link href="/vocab/flashcard" className="btn-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold">
            <Layers size={18} aria-hidden="true" />
            Ôn thẻ
          </Link>
          <Link
            href="/vocab/quiz"
            className="flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-medium hover:bg-surface-2"
          >
            <ListChecks size={18} aria-hidden="true" />
            Trắc nghiệm
          </Link>
        </div>
      )}

      <VocabList
        items={trang.items.map((t) => ({ ...t, dueAt: t.dueAt.toISOString() }))}
        total={trang.total}
        page={trang.page}
        pageSize={trang.pageSize}
        q={sp.q ?? ""}
        now={now.toISOString()}
      />
    </div>
  );
}
