import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { listReadingsAdmin } from "@/features/reading/admin/list-readings-admin";
import { ReadingAdminFilters } from "@/components/admin/ReadingAdminFilters";
import { ReadingTable } from "@/components/admin/ReadingTable";
import type { ContentStatus, QuestionSource, ReadingGenre } from "@prisma/client";

export const metadata: Metadata = { title: "Bài đọc" };

type Search = { status?: string; genre?: string; source?: string; q?: string; page?: string };

const TRANG_THAI = ["DRAFT", "PUBLISHED"];
const THE_LOAI = ["HUMOR", "FAIRY_TALE", "ANIME", "NEWS"];
const NGUON = ["AI", "IMPORT", "MANUAL"];

/** Chỉ nhận giá trị nằm trong danh sách hợp lệ, tránh đẩy chuỗi lạ từ URL xuống Prisma. */
function hopLe<T extends string>(value: string | undefined, cho: string[]): T | undefined {
  return value && cho.includes(value) ? (value as T) : undefined;
}

function urlTrang(sp: Search, page: number) {
  const p = new URLSearchParams();
  for (const k of ["status", "genre", "source", "q"] as const) if (sp[k]) p.set(k, sp[k]);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/admin/readings?${s}` : "/admin/readings";
}

export default async function AdminReadingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const sp = await searchParams;
  const trang = await listReadingsAdmin(prisma, {
    status: hopLe<ContentStatus>(sp.status, TRANG_THAI),
    genre: hopLe<ReadingGenre>(sp.genre, THE_LOAI),
    source: hopLe<QuestionSource>(sp.source, NGUON),
    q: sp.q || undefined,
    page: Number(sp.page) || 1,
  });
  const soTrang = Math.max(1, Math.ceil(trang.total / trang.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <BookOpen size={26} className="text-accent-text" aria-hidden="true" />
          Bài đọc
        </h1>
        <p className="mt-2 text-muted">
          {trang.total === 0
            ? "Chưa có bài đọc nào."
            : `Tìm thấy ${trang.total} bài, đang xem trang ${trang.page}/${soTrang}.`}
        </p>
        <div className="mt-3 flex gap-4 text-sm">
          <Link href="/admin/readings/import" className="text-accent underline">
            Nhập JSON
          </Link>
          <Link href="/admin/readings/generate" className="text-accent underline">
            Sinh bằng AI
          </Link>
        </div>
      </header>

      <ReadingAdminFilters status={sp.status} genre={sp.genre} source={sp.source} q={sp.q} />

      <ReadingTable items={trang.items} />

      {soTrang > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {trang.page > 1 && (
            <Link href={urlTrang(sp, trang.page - 1)} className="rounded-lg border border-line px-4 py-2 hover:bg-surface-2">
              Trang trước
            </Link>
          )}
          <span className="text-muted">
            Trang {trang.page}/{soTrang}
          </span>
          {trang.page < soTrang && (
            <Link href={urlTrang(sp, trang.page + 1)} className="rounded-lg border border-line px-4 py-2 hover:bg-surface-2">
              Trang sau
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
