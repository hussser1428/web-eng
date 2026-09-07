"use client";

import Link from "next/link";
import { deleteReadingAction, setReadingStatusAction } from "@/app/admin/actions";
import { GENRE_LABELS, LEVEL_LABELS } from "@/features/reading/labels";
import type { ReadingAdminRow } from "@/features/reading/admin/list-readings-admin";

const NHAN_NGUON: Record<string, string> = { AI: "AI", IMPORT: "Nhập file", MANUAL: "Tự soạn" };

/** Client vì nút Xoá cần `window.confirm`: xoá bài là mất hẳn cả bài lẫn câu, không hoàn tác được. */
export function ReadingTable({ items }: { items: ReadingAdminRow[] }) {
  if (items.length === 0) return <p className="card p-6 text-muted">Không có bài đọc nào khớp bộ lọc.</p>;

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="px-4 py-3 font-semibold">Tiêu đề</th>
            <th className="px-4 py-3 font-semibold">Thể loại</th>
            <th className="px-4 py-3 font-semibold">Độ khó</th>
            <th className="px-4 py-3 font-semibold">Số câu</th>
            <th className="px-4 py-3 font-semibold">Trạng thái</th>
            <th className="px-4 py-3 font-semibold">Nguồn</th>
            <th className="px-4 py-3 font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              <td className="max-w-xs px-4 py-3">
                <Link href={`/admin/readings/${r.id}`} className="font-medium hover:underline">
                  {r.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted">{GENRE_LABELS[r.genre]}</td>
              <td className="px-4 py-3 text-muted">{LEVEL_LABELS[r.level]}</td>
              <td className="px-4 py-3 text-muted">{r.sentenceCount}</td>
              <td className="px-4 py-3">
                <span className={r.status === "PUBLISHED" ? "text-accent" : "text-info"}>
                  {r.status === "PUBLISHED" ? "Đã đăng" : "Nháp"}
                </span>
              </td>
              <td className="px-4 py-3 text-muted">{NHAN_NGUON[r.source] ?? r.source}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <form action={setReadingStatusAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      name="status"
                      value={r.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                      className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-surface-2"
                    >
                      {r.status === "PUBLISHED" ? "Gỡ" : "Đăng"}
                    </button>
                  </form>
                  <form
                    action={deleteReadingAction}
                    onSubmit={(e) => {
                      if (!window.confirm("Xoá bài này? Không hoàn tác được.")) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <button className="rounded-lg border border-line px-3 py-1.5 font-medium text-danger hover:bg-surface-2">
                      Xoá
                    </button>
                  </form>
                  {r.status === "PUBLISHED" && (
                    <Link href={`/reading/${r.id}`} className="text-accent underline">
                      Xem
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
