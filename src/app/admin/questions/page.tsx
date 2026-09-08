import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { listQuestions } from "@/features/admin/list-questions";
import { QuestionFilters } from "@/components/admin/QuestionFilters";
import { QuestionTable } from "@/components/admin/QuestionTable";
import type { ContentStatus, QuestionSource } from "@prisma/client";

export const metadata: Metadata = { title: "Câu hỏi" };

// Nút "Tạo audio" tổng hợp tuần tự nhiều lượt nói, vượt trần mặc định 10 giây của Vercel.
export const maxDuration = 60;

type Search = { section?: string; status?: string; source?: string; q?: string; missingAudio?: string; page?: string };

const TRANG_THAI = ["DRAFT", "PUBLISHED"];
const NGUON = ["AI", "IMPORT", "MANUAL"];

/** Chỉ nhận giá trị nằm trong danh sách hợp lệ, tránh đẩy chuỗi lạ từ URL xuống Prisma. */
function hopLe<T extends string>(value: string | undefined, cho: string[]): T | undefined {
  return value && cho.includes(value) ? (value as T) : undefined;
}

function urlTrang(sp: Search, page: number) {
  const p = new URLSearchParams();
  for (const k of ["section", "status", "source", "q", "missingAudio"] as const) if (sp[k]) p.set(k, sp[k]);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/admin/questions?${s}` : "/admin/questions";
}

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const sp = await searchParams;
  const trang = await listQuestions(prisma, {
    section: sp.section || undefined,
    status: hopLe<ContentStatus>(sp.status, TRANG_THAI),
    source: hopLe<QuestionSource>(sp.source, NGUON),
    q: sp.q || undefined,
    missingAudio: sp.missingAudio === "1",
    page: Number(sp.page) || 1,
  });
  const soTrang = Math.max(1, Math.ceil(trang.total / trang.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <FileQuestion size={26} className="text-accent-text" aria-hidden="true" />
          Câu hỏi
        </h1>
        <p className="mt-2 text-muted">
          {trang.total === 0 ? "Kho câu hỏi đang trống." : `Tìm thấy ${trang.total} câu, đang xem trang ${trang.page}/${soTrang}.`}
        </p>
      </header>

      <QuestionFilters
        section={sp.section}
        status={sp.status}
        source={sp.source}
        q={sp.q}
        missingAudio={sp.missingAudio === "1"}
      />

      <QuestionTable items={trang.items} />

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
