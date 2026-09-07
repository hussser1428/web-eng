import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getReading } from "@/features/reading/get-reading";
import { GENRE_LABELS, LEVEL_LABELS } from "@/features/reading/labels";
import { ReadingView } from "@/components/reading/ReadingView";

// React cache gộp hai lần gọi (generateMetadata + trang) trong cùng một request thành một truy vấn.
const loadReading = cache((id: string) => getReading(prisma, id));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const reading = await loadReading(id);
  return { title: reading?.title ?? "Bài đọc" };
}

export default async function ReadingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reading = await loadReading(id);
  if (!reading) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <Link href="/reading" className="text-sm text-info hover:underline">
          ← Danh sách
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">{reading.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {GENRE_LABELS[reading.genre]} · {LEVEL_LABELS[reading.level]} · {reading.wordCount} từ
        </p>
      </header>

      <ReadingView reading={reading} />
    </div>
  );
}
