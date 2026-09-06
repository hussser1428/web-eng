import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { listExams } from "@/features/admin/list-exams";
import { BuildExamForm } from "@/components/admin/BuildExamForm";
import { setExamStatusAction } from "../actions";

export const metadata: Metadata = { title: "Đề thi" };

export default async function AdminExamsPage() {
  await requireAdmin();
  const de = await listExams(prisma);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <ClipboardList size={26} className="text-accent-text" aria-hidden="true" />
          Đề thi
        </h1>
        <p className="mt-2 text-muted">
          Ghép đề tự động từ câu đã đăng, đủ số câu từng phần. Đề mới ở trạng thái nháp, đăng thì người học mới thấy.
        </p>
      </header>

      <BuildExamForm />

      {de.length === 0 ? (
        <p className="card p-5 text-muted">Chưa có đề nào.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Tên đề</th>
                <th className="px-4 py-3 font-medium">Số câu</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {de.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{d.title}</td>
                  <td className="px-4 py-3">{d.questionCount}</td>
                  <td className={`px-4 py-3 font-semibold ${d.status === "PUBLISHED" ? "text-accent" : "text-info"}`}>
                    {d.status === "PUBLISHED" ? "Đã đăng" : "Nháp"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <form action={setExamStatusAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <button
                          name="status"
                          value={d.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                          className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-surface-2"
                        >
                          {d.status === "PUBLISHED" ? "Gỡ" : "Đăng"}
                        </button>
                      </form>
                      {d.status === "PUBLISHED" ? (
                        <Link href={`/exam/${d.id}`} className="text-accent underline">
                          Mở đề
                        </Link>
                      ) : (
                        // Trang /exam/[id] trả 404 với đề nháp, nên đừng mời bấm vào.
                        <span className="text-muted">Đăng đề rồi mới mở được</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
