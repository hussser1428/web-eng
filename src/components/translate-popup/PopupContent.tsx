"use client";

import type { TranslateResult } from "@/features/translate/translate";
import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speak";

export type PopupData = TranslateResult & { canSave: boolean };
export type SaveState = "idle" | "saving" | "saved" | "error";

export function PopupContent({
  data,
  context,
  onSave,
  saveState,
}: {
  data: PopupData;
  context: string;
  onSave: (wordId: string, context: string) => void;
  saveState: SaveState;
}) {
  if (data.kind === "unavailable") {
    return <p className="text-sm text-muted">Chưa dịch được. Vui lòng thử lại sau.</p>;
  }

  if (data.kind === "text") {
    return (
      <div className="text-sm">
        <p className="mb-1 text-xs text-muted">{data.from === "en" ? "Anh → Việt" : "Việt → Anh"}</p>
        <p>{data.result}</p>
      </div>
    );
  }

  const w = data.word;
  return (
    <div className="text-sm">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold">{w.headword}</span>
        {w.phonetic && <span className="text-muted">/{w.phonetic}/</span>}
        <button type="button" aria-label="Phát âm" onClick={() => speak(w.headword)} className="rounded-full border border-line p-1 hover:bg-surface-2">
          <Volume2 size={14} aria-hidden="true" />
        </button>
      </div>
      {w.pos && <p className="text-xs italic text-muted">{w.pos}</p>}
      <p className="mt-1">{w.meaningVi}</p>
      {w.exampleEn && (
        <p className="mt-1 text-xs text-muted">
          <span>{w.exampleEn}</span>
          {w.exampleVi && <span> — {w.exampleVi}</span>}
        </p>
      )}
      <div className="mt-2">
        {data.canSave ? (
          saveState === "saved" ? (
            <span className="text-xs text-emerald-300">Đã lưu vào từ vựng</span>
          ) : (
            <button
              type="button"
              disabled={saveState === "saving"}
              onClick={() => onSave(w.id, context)}
              className="btn-primary rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50"
            >
              Lưu từ
            </button>
          )
        ) : (
          <span className="text-xs text-muted">Đăng nhập để lưu từ</span>
        )}
        {saveState === "error" && <span className="ml-2 text-xs text-danger">Lưu thất bại</span>}
      </div>
    </div>
  );
}
