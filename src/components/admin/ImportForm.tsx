"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { importAction } from "@/app/admin/actions";
import { inputClass, labelClass, primaryButtonClass } from "@/components/layout/AuthCard";

export function ImportForm() {
  const [ketQua, action, dangGui] = useActionState(importAction, null);
  const [json, setJson] = useState("");

  function chonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setJson(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Chọn file JSON</span>
        <input type="file" accept=".json" onChange={chonFile} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Nội dung JSON</span>
        <textarea
          name="json"
          rows={12}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder='{"certificate": "toeic", "questions": [...]}'
          className={`${inputClass} font-mono text-xs`}
        />
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="publish" className="size-4" />
        <span className={labelClass}>Đăng ngay</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Tạo đề tên (bỏ trống nếu chỉ nhập câu lẻ)</span>
        <input name="examTitle" className={inputClass} />
      </label>

      {ketQua && !ketQua.ok && (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-sm font-semibold text-danger">Không nhập được:</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-danger">
            {ketQua.issues.map((loi, i) => (
              <li key={i}>{loi}</li>
            ))}
          </ul>
        </div>
      )}

      {ketQua?.ok && (
        <div className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
          <p className="font-semibold text-info">
            Đã nhập {ketQua.questions} câu và {ketQua.groups} nhóm.
          </p>
          <p className="mt-1 flex flex-wrap gap-4">
            <Link href="/admin/questions" className="text-accent underline">
              Xem danh sách câu hỏi
            </Link>
            {ketQua.examId &&
              (ketQua.published ? (
                <Link href={`/exam/${ketQua.examId}`} className="text-accent underline">
                  Mở đề vừa tạo
                </Link>
              ) : (
                // Không tích "Đăng ngay" thì đề ở trạng thái nháp, /exam/[id] trả 404.
                <span className="text-muted">Đề vừa tạo đang là nháp — đăng ở trang Đề thi rồi mới mở được</span>
              ))}
          </p>
        </div>
      )}

      <button disabled={dangGui} className={`${primaryButtonClass} sm:w-40`}>
        Nhập
      </button>
    </form>
  );
}
