"use client";

import { useEffect, useState } from "react";
import { useSelection } from "./use-selection";
import { PopupContent, type PopupData, type SaveState } from "./PopupContent";

const POPUP_WIDTH = 320;

export function TranslatePopup() {
  const sel = useSelection();
  const [data, setData] = useState<PopupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    if (!sel) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSaveState("idle");
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: sel.text }),
    })
      .then(async (r) => (r.ok ? ((await r.json()) as PopupData) : null))
      .catch(() => null)
      .then((d) => {
        if (cancelled) return;
        setData(d ?? { kind: "unavailable", from: "en", to: "vi", canSave: false });
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sel]);

  if (!sel) return null;

  const left = Math.max(8, Math.min(sel.rect.left + sel.rect.width / 2 - POPUP_WIDTH / 2, window.innerWidth - POPUP_WIDTH - 8));
  const top = sel.rect.top - 8;

  const onSave = async (wordId: string, context: string) => {
    setSaveState("saving");
    try {
      const r = await fetch("/api/vocab/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId, context }),
      });
      setSaveState(r.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div
      data-translate-popup
      role="dialog"
      aria-label="Dịch"
      style={{ position: "absolute", left, top, width: POPUP_WIDTH, transform: "translateY(-100%)" }}
      className="z-50 rounded-lg border bg-white p-3 shadow-lg"
    >
      {loading || !data ? <p className="text-sm text-gray-500">Đang dịch…</p> : <PopupContent data={data} context={sel.context} onSave={onSave} saveState={saveState} />}
    </div>
  );
}
