import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getReadingAdmin } from "@/features/reading/admin/get-reading-admin";
import { ReadingEditForm } from "@/components/admin/ReadingEditForm";

export const metadata: Metadata = { title: "Sửa bài đọc" };

export default async function AdminReadingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const bai = await getReadingAdmin(prisma, id);
  if (!bai) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/admin/readings" className="flex w-fit items-center gap-1.5 text-sm text-muted hover:underline">
          <ArrowLeft size={18} aria-hidden="true" />
          Về danh sách bài đọc
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">Sửa bài đọc</h1>
        <p className="mt-2 text-muted">
          {bai.wordCount} từ — {bai.status === "PUBLISHED" ? "đã đăng" : "nháp"}
        </p>
      </header>

      <ReadingEditForm reading={bai} />
    </div>
  );
}
