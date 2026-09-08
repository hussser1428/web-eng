"use client";

import { useActionState, useId } from "react";
import { generateAction } from "@/app/admin/actions";
import { SKILL_TAGS } from "@/features/admin/prompts/skill-tags";
import { TOEIC } from "@/features/certificates";
import { inputClass, labelClass, primaryButtonClass } from "@/components/layout/AuthCard";

/** Part 1 cần ảnh nên chưa sinh được bằng AI; Part 2–4 sinh transcript rồi tạo audio ở trang Câu hỏi. */
const PARTS = TOEIC.sections.filter((s) => s.id !== "toeic.p1");

export function GenerateForm({ llmReady }: { llmReady: boolean }) {
  const [thongBao, action, dangChay] = useActionState(generateAction, null);
  const dsKyNang = useId();

  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Phần thi</span>
        <select name="section" defaultValue="toeic.p5" className={inputClass}>
          {PARTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Kỹ năng (bỏ trống để trộn nhiều kỹ năng)</span>
        <input name="skillTag" list={dsKyNang} placeholder="grammar.tense" className={inputClass} />
        <datalist id={dsKyNang}>
          {SKILL_TAGS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Số câu (1–10)</span>
        <input type="number" name="count" min={1} max={10} defaultValue={5} className={`${inputClass} sm:w-32`} />
      </label>

      <p className="text-sm text-muted">
        Part 2–4 sinh transcript, sau đó chọn câu ở trang Câu hỏi và bấm Tạo audio. Part 1 cần ảnh nên nhập file. Part
        3, 4 sinh theo nhóm 3 câu và Part 6 theo đoạn 4 câu nên số câu thực tế được làm tròn. Câu sinh ra vào nháp,
        phải duyệt rồi mới đăng.
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
