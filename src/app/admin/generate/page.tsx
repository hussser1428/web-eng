import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLlmProvider } from "@/lib/providers/llm";
import { requireAdmin } from "@/lib/require-admin";
import { listJobs } from "@/features/admin/list-jobs";
import { getCertificate, getSection } from "@/features/certificates";
import { GenerateForm } from "@/components/admin/GenerateForm";
import { retryJobAction } from "../actions";

export const metadata: Metadata = { title: "Sinh câu hỏi bằng AI" };

// Sinh đồng bộ trong một request: gọi LLM mất 20–40 giây nên phải nới trần mặc định 10 giây của Vercel.
export const maxDuration = 60;

const TRANG_THAI: Record<string, { nhan: string; mau: string }> = {
  PENDING: { nhan: "Chờ chạy", mau: "text-info" },
  RUNNING: { nhan: "Đang chạy", mau: "text-info" },
  DONE: { nhan: "Xong", mau: "text-accent" },
  FAILED: { nhan: "Lỗi", mau: "text-danger" },
};

export default async function AdminGeneratePage() {
  await requireAdmin();
  const jobs = await listJobs(prisma, { type: "questions" });
  const cert = getCertificate("toeic");
  const llmReady = getLlmProvider() !== null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <Sparkles size={26} className="text-accent-text" aria-hidden="true" />
          Sinh câu hỏi bằng AI
        </h1>
        <p className="mt-2 text-muted">
          Sinh được Part 2–7. Part 2–4 sinh transcript, sau đó chọn câu ở trang Câu hỏi và bấm Tạo audio. Part 1 cần
          ảnh nên nhập file. Mỗi lô tối đa 10 câu.
        </p>
      </header>

      <GenerateForm llmReady={llmReady} />

      <p>
        <Link href="/admin/questions?status=DRAFT&source=AI" className="text-accent underline">
          Xem nháp
        </Link>
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Lịch sử sinh</h2>
        {jobs.length === 0 ? (
          <p className="card p-5 text-muted">Chưa sinh lô nào.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Thời gian</th>
                  <th className="px-4 py-3 font-medium">Part</th>
                  <th className="px-4 py-3 font-medium">Số câu yêu cầu</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Lỗi</th>
                  <th className="px-4 py-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const p = (j.params ?? {}) as { section?: string; count?: number };
                  const tt = TRANG_THAI[j.status] ?? { nhan: j.status, mau: "text-muted" };
                  return (
                    <tr key={j.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap">{j.createdAt.toLocaleString("vi-VN")}</td>
                      <td className="px-4 py-3">
                        {(p.section && getSection(cert, p.section)?.name) ?? p.section ?? "—"}
                      </td>
                      <td className="px-4 py-3">{p.count ?? "—"}</td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${tt.mau}`}>
                        {j.status === "DONE" ? `${tt.nhan} – ${j.resultCount} câu` : tt.nhan}
                      </td>
                      <td className="px-4 py-3 text-danger">{j.error ?? ""}</td>
                      <td className="px-4 py-3">
                        {j.status === "FAILED" && (
                          <form action={retryJobAction}>
                            <input type="hidden" name="jobId" value={j.id} />
                            <button className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-surface-2">
                              Chạy lại
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
