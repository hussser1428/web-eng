"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { importReadingAction } from "@/app/admin/actions";
import { inputClass, labelClass, primaryButtonClass } from "@/components/layout/AuthCard";

export function ReadingImportForm() {
  const [ketQua, action, dangGui] = useActionState(importReadingAction, null);
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
          placeholder='{"title": "...", "genre": "FAIRY_TALE", "paragraphs": [[{"en": "...", "vi": "..."}]]}'
          className={`${inputClass} font-mono text-xs`}
        />
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="publish" className="size-4" />
        <span className={labelClass}>Đăng ngay</span>
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
          <p className="font-semibold text-info">Đã nhập bài đọc {ketQua.sentences} câu.</p>
          <p className="mt-1 flex flex-wrap gap-4">
            <Link href={`/admin/readings/${ketQua.readingId}`} className="text-accent underline">
              Sửa bài
            </Link>
            {ketQua.published ? (
              <Link href={`/reading/${ketQua.readingId}`} className="text-accent underline">
                Xem bài
              </Link>
            ) : (
              // Không tích "Đăng ngay" thì bài ở trạng thái nháp, /reading/[id] trả 404.
              <span className="text-muted">Bài đang là nháp — đăng ở trang Bài đọc rồi mới mở được</span>
            )}
          </p>
        </div>
      )}

      <button disabled={dangGui} className={`${primaryButtonClass} sm:w-40`}>
        Nhập
      </button>
    </form>
  );
}
