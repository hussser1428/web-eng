"use client";

import { useActionState } from "react";
import { updateQuestionAction } from "@/app/admin/actions";
import { inputClass, labelClass, primaryButtonClass } from "@/components/layout/AuthCard";

const CHU_CAI = ["A", "B", "C", "D"];

export type QuestionFormData = {
  id: string;
  stem: string | null;
  choices: string[];
  answer: number;
  explanation: string;
  skillTags: string[];
  audioUrl: string | null;
  imageUrl: string | null;
  transcript: string | null;
  group: { passage: string | null; transcript: string | null } | null;
};

/** Khối chỉ đọc: nội dung nhóm dùng chung cho nhiều câu, sửa ở đây sẽ ảnh hưởng cả nhóm nên chưa cho sửa. */
function NhomChiDoc({ nhan, noiDung }: { nhan: string; noiDung: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted">{nhan}</h2>
      <p className="mt-1 whitespace-pre-wrap rounded-xl border border-line bg-surface-2 p-3 text-sm">{noiDung}</p>
    </div>
  );
}

export function QuestionForm({ question, choiceCount }: { question: QuestionFormData; choiceCount: number }) {
  const [loi, action, dangGui] = useActionState(updateQuestionAction, null);
  const nhom = question.group;

  return (
    <div className="flex flex-col gap-4" data-no-translate>
      {nhom && (nhom.passage || nhom.transcript) && (
        <div className="card flex flex-col gap-3 p-5">
          {nhom.passage && <NhomChiDoc nhan="Đoạn văn của nhóm" noiDung={nhom.passage} />}
          {nhom.transcript && <NhomChiDoc nhan="Transcript của nhóm" noiDung={nhom.transcript} />}
        </div>
      )}

      <form action={action} className="card flex flex-col gap-4 p-5">
        <input type="hidden" name="id" value={question.id} />

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Đề bài</span>
          <textarea name="stem" rows={3} defaultValue={question.stem ?? ""} className={inputClass} />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className={labelClass}>Lựa chọn và đáp án đúng</legend>
          {Array.from({ length: choiceCount }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="answer"
                value={i}
                defaultChecked={question.answer === i}
                aria-label={`Chọn ${CHU_CAI[i]} làm đáp án`}
                className="size-4"
              />
              <span className="w-5 text-sm text-muted">{CHU_CAI[i]}</span>
              <input
                name="choices"
                defaultValue={question.choices[i] ?? ""}
                aria-label={`Lựa chọn ${CHU_CAI[i]}`}
                className={inputClass}
              />
            </div>
          ))}
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Giải thích</span>
          <textarea name="explanation" rows={3} defaultValue={question.explanation} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Nhãn kỹ năng (phân cách bằng dấu phẩy)</span>
          <input name="skillTags" defaultValue={question.skillTags.join(", ")} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Đường dẫn audio</span>
          <input name="audioUrl" type="url" defaultValue={question.audioUrl ?? ""} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Đường dẫn ảnh</span>
          <input name="imageUrl" type="url" defaultValue={question.imageUrl ?? ""} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Transcript</span>
          <textarea name="transcript" rows={3} defaultValue={question.transcript ?? ""} className={inputClass} />
        </label>

        {loi && <p className="text-sm text-danger">{loi}</p>}

        <button disabled={dangGui} className={`${primaryButtonClass} sm:w-40`}>
          Lưu
        </button>
      </form>
    </div>
  );
}
