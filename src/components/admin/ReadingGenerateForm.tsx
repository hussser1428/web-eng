"use client";

import { useActionState } from "react";
import { generateReadingAction } from "@/app/admin/actions";
import { GENRE_LABELS, GENRES, LEVEL_LABELS, LEVELS } from "@/features/reading/labels";
import { LENGTH_WORDS, type ReadingLength } from "@/features/admin/prompts/reading";
import { inputClass, labelClass, primaryButtonClass } from "@/components/layout/AuthCard";

const DO_DAI: Array<{ id: ReadingLength; nhan: string }> = [
  { id: "short", nhan: `Ngắn (~${LENGTH_WORDS.short} từ)` },
  { id: "medium", nhan: `Vừa (~${LENGTH_WORDS.medium} từ)` },
  { id: "long", nhan: `Dài (~${LENGTH_WORDS.long} từ)` },
];

export function ReadingGenerateForm({ llmReady }: { llmReady: boolean }) {
  const [thongBao, action, dangChay] = useActionState(generateReadingAction, null);

  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Thể loại</span>
        <select name="genre" defaultValue="FAIRY_TALE" className={inputClass}>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {GENRE_LABELS[g]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Độ khó</span>
        <select name="level" defaultValue="A2" className={inputClass}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABELS[l]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Độ dài</span>
        <select name="length" defaultValue="short" className={inputClass}>
          {DO_DAI.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nhan}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Chủ đề (bỏ trống để AI tự chọn)</span>
        <input name="topic" maxLength={100} placeholder="một chuyến tàu muộn" className={inputClass} />
      </label>

      <p className="text-sm text-muted">
        Bài sinh ra vào nháp, phải đọc lại và sửa rồi mới đăng. Mỗi câu tiếng Anh đều kèm bản dịch tiếng Việt.
      </p>

      {!llmReady && <p className="text-sm font-semibold text-danger">Chưa cấu hình LLM (LLM_API_KEY)</p>}

      <button disabled={dangChay || !llmReady} className={`${primaryButtonClass} sm:w-40`}>
        Sinh
      </button>

      {dangChay && <p className="text-sm text-muted">Đang gọi LLM, khoảng 20–40 giây…</p>}

      {thongBao && !dangChay && (
        <p className={`text-sm font-semibold ${thongBao.startsWith("Đã tạo") ? "text-info" : "text-danger"}`}>
          {thongBao}
        </p>
      )}
    </form>
  );
}
