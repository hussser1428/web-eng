import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, FileQuestion, Upload, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { countQuestions } from "@/features/admin/count-questions";

export const metadata: Metadata = { title: "Quản trị" };

export default async function AdminPage() {
  const sections = await countQuestions(prisma);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <LayoutDashboard size={26} className="text-accent-text" aria-hidden="true" />
          Tổng quan kho câu hỏi
        </h1>
        <p className="mt-2 text-muted">Số câu đã đăng, còn nháp và số câu cần cho một đề đầy đủ theo từng phần thi.</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/questions" className="btn-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold">
          <FileQuestion size={18} aria-hidden="true" />
          Câu hỏi
        </Link>
        <Link
          href="/admin/import"
          className="flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-medium hover:bg-surface-2"
        >
          <Upload size={18} aria-hidden="true" />
          Nhập file
        </Link>
        <Link
          href="/admin/generate"
          className="flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-medium hover:bg-surface-2"
        >
          <Sparkles size={18} aria-hidden="true" />
          Sinh bằng AI
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-4 py-3 font-semibold">Part</th>
              <th className="px-4 py-3 font-semibold">Đã đăng</th>
              <th className="px-4 py-3 font-semibold">Nháp</th>
              <th className="px-4 py-3 font-semibold">Cần cho một đề</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => {
              const thieu = s.published < s.required;
              return (
                <tr key={s.section} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className={`px-4 py-3 ${thieu ? "text-danger" : ""}`}>{s.published}</td>
                  <td className="px-4 py-3 text-info">{s.draft}</td>
                  <td className="px-4 py-3 text-muted">{s.required}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
