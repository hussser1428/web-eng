"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { generateAudioAction, setStatusAction } from "@/app/admin/actions";
import { TOEIC, getSection } from "@/features/certificates";
import type { QuestionRow } from "@/features/admin/list-questions";

const NHAN_NGUON: Record<string, string> = { AI: "AI", IMPORT: "Nhập file", MANUAL: "Tự soạn" };

const CHU_CAI = ["A", "B", "C", "D"];

function dapAn(r: QuestionRow) {
  const chu = CHU_CAI[r.answer] ?? String(r.answer + 1);
  return `${chu}. ${r.choices[r.answer] ?? ""}`;
}

export function QuestionTable({ items }: { items: QuestionRow[] }) {
  const [thongBao, action, dangChay] = useActionState(setStatusAction, null);
  const [thongBaoAudio, audioAction, dangTaoAudio] = useActionState(generateAudioAction, null);

  if (items.length === 0) return <p className="card p-6 text-muted">Không có câu hỏi nào khớp bộ lọc.</p>;

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          name="status"
          value="PUBLISHED"
          disabled={dangChay}
          className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Đăng
        </button>
        <button
          name="status"
          value="DRAFT"
          disabled={dangChay}
          className="rounded-lg border border-line px-5 py-2 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
        >
          Gỡ
        </button>
        <button
          formAction={audioAction}
          disabled={dangTaoAudio}
          className="flex items-center gap-1.5 rounded-lg border border-line px-5 py-2 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
        >
          <Volume2 size={18} aria-hidden="true" />
          Tạo audio
        </button>
        {thongBao && <p className="text-sm text-muted">{thongBao}</p>}
        {thongBaoAudio && <p className="text-sm text-muted">{thongBaoAudio}</p>}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="px-4 py-3 font-semibold">
                <span className="sr-only">Chọn</span>
              </th>
              <th className="px-4 py-3 font-semibold">Đề bài</th>
              <th className="px-4 py-3 font-semibold">Phần thi</th>
              <th className="px-4 py-3 font-semibold">Đáp án</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Nguồn</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const spec = getSection(TOEIC, r.section);
              const thieuAudio = Boolean(spec?.hasAudio) && !r.hasAudio;
              const tieuDe = r.stem ?? "(câu không có đề bài riêng)";
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <input type="checkbox" name="ids" value={r.id} aria-label={`Chọn câu: ${tieuDe}`} className="size-4" />
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <Link href={`/admin/questions/${r.id}`} className="font-medium hover:underline">
                      {tieuDe}
                    </Link>
                    {r.groupId && <span className="ml-2 text-xs text-muted">theo nhóm</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      {spec?.name ?? r.section}
                      {thieuAudio && (
                        <>
                          <VolumeX size={18} className="text-danger" aria-hidden="true" />
                          <span className="text-xs text-danger">thiếu audio</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{dapAn(r)}</td>
                  <td className="px-4 py-3">
                    <span className={r.status === "PUBLISHED" ? "text-accent" : "text-info"}>
                      {r.status === "PUBLISHED" ? "Đã đăng" : "Nháp"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{NHAN_NGUON[r.source] ?? r.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </form>
  );
}
