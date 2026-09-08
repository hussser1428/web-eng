import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLlmProvider } from "@/lib/providers/llm";
import { requireAdmin } from "@/lib/require-admin";
import { listJobs } from "@/features/admin/list-jobs";
import { GENRE_LABELS, LEVEL_LABELS } from "@/features/reading/labels";
import type { ReadingGenre, ReadingLevel } from "@prisma/client";
import { ReadingGenerateForm } from "@/components/admin/ReadingGenerateForm";
import { retryReadingJobAction } from "../../actions";

export const metadata: Metadata = { title: "Sinh bài đọc bằng AI" };

// Sinh đồng bộ trong một request: gọi LLM mất 20–40 giây nên phải nới trần mặc định 10 giây của Vercel.
export const maxDuration = 60;

const TRANG_THAI: Record<string, { nhan: string; mau: string }> = {
  PENDING: { nhan: "Chờ chạy", mau: "text-info" },
  RUNNING: { nhan: "Đang chạy", mau: "text-info" },
  DONE: { nhan: "Xong", mau: "text-accent" },
  FAILED: { nhan: "Lỗi", mau: "text-danger" },
};

const DO_DAI: Record<string, string> = { short: "Ngắn", medium: "Vừa", long: "Dài" };

export default async function AdminReadingGeneratePage() {
  await requireAdmin();
  const jobs = await listJobs(prisma, { type: "reading" });
  const llmReady = getLlmProvider() !== null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <Sparkles size={26} className="text-accent-text" aria-hidden="true" />
          Sinh bài đọc bằng AI
        </h1>
        <p className="mt-2 text-muted">
          Chọn thể loại, độ khó, độ dài rồi để AI viết một bài song ngữ. Bài sinh ra vào nháp, duyệt xong mới đăng.
        </p>
      </header>

      <ReadingGenerateForm llmReady={llmReady} />

      <p>
        <Link href="/admin/readings?status=DRAFT&source=AI" className="text-accent underline">
          Xem nháp
        </Link>
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Lịch sử sinh</h2>
        {jobs.length === 0 ? (
          <p className="card p-5 text-muted">Chưa sinh bài nào.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Thời gian</th>
                  <th className="px-4 py-3 font-medium">Thể loại</th>
                  <th className="px-4 py-3 font-medium">Độ khó</th>
                  <th className="px-4 py-3 font-medium">Độ dài</th>
                  <th className="px-4 py-3 font-medium">Chủ đề</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Lỗi</th>
                  <th className="px-4 py-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const p = (j.params ?? {}) as {
                    genre?: ReadingGenre;
                    level?: ReadingLevel;
                    length?: string;
                    topic?: string | null;
                  };
                  const tt = TRANG_THAI[j.status] ?? { nhan: j.status, mau: "text-muted" };
                  return (
                    <tr key={j.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap">{j.createdAt.toLocaleString("vi-VN")}</td>
                      <td className="px-4 py-3">{(p.genre && GENRE_LABELS[p.genre]) ?? "—"}</td>
                      <td className="px-4 py-3">{(p.level && LEVEL_LABELS[p.level]) ?? "—"}</td>
                      <td className="px-4 py-3">{(p.length && DO_DAI[p.length]) ?? "—"}</td>
                      <td className="px-4 py-3">{p.topic || "—"}</td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${tt.mau}`}>
                        {j.status === "DONE" ? `${tt.nhan} – ${j.resultCount} câu` : tt.nhan}
                      </td>
                      <td className="px-4 py-3 text-danger">{j.error ?? ""}</td>
                      <td className="px-4 py-3">
                        {j.status === "FAILED" && (
                          <form action={retryReadingJobAction}>
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
