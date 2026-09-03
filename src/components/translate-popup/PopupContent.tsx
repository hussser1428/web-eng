"use client";

import type { TranslateResult } from "@/features/translate/translate";

export type PopupData = TranslateResult & { canSave: boolean };
export type SaveState = "idle" | "saving" | "saved" | "error";

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

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
    return <p className="text-sm text-gray-600">Chưa dịch được. Vui lòng thử lại sau.</p>;
  }

  if (data.kind === "text") {
    return (
      <div className="text-sm">
        <p className="mb-1 text-xs text-gray-500">{data.from === "en" ? "Anh → Việt" : "Việt → Anh"}</p>
        <p>{data.result}</p>
      </div>
    );
  }

  const w = data.word;
  return (
    <div className="text-sm">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold">{w.headword}</span>
        {w.phonetic && <span className="text-gray-500">/{w.phonetic}/</span>}
        <button type="button" aria-label="Phát âm" onClick={() => speak(w.headword)} className="rounded border px-1 text-xs">
          🔊
        </button>
      </div>
      {w.pos && <p className="text-xs italic text-gray-500">{w.pos}</p>}
      <p className="mt-1">{w.meaningVi}</p>
      {w.exampleEn && (
        <p className="mt-1 text-xs text-gray-600">
          <span>{w.exampleEn}</span>
          {w.exampleVi && <span> — {w.exampleVi}</span>}
        </p>
      )}
      <div className="mt-2">
        {data.canSave ? (
          saveState === "saved" ? (
            <span className="text-xs text-green-700">Đã lưu vào từ vựng</span>
          ) : (
            <button
              type="button"
              disabled={saveState === "saving"}
              onClick={() => onSave(w.id, context)}
              className="rounded bg-blue-600 px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              Lưu từ
            </button>
          )
        ) : (
          <span className="text-xs text-gray-500">Đăng nhập để lưu từ</span>
        )}
        {saveState === "error" && <span className="ml-2 text-xs text-red-600">Lưu thất bại</span>}
      </div>
    </div>
  );
}
