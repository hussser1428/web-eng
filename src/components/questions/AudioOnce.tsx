"use client";

import { useEffect, useRef, useState } from "react";

type Props = { src: string; autoPlay?: boolean; onEnded?: () => void };

/** Phát audio đúng một lần, không cho tua lại (quy tắc phòng thi). */
export function AudioOnce({ src, autoPlay = false, onEnded }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "done">("idle");

  useEffect(() => {
    if (autoPlay && state === "idle") {
      ref.current?.play().then(() => setState("playing")).catch(() => {/* trình duyệt chặn autoplay: chờ người dùng bấm */});
    }
  }, [autoPlay, state]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
      <audio ref={ref} src={src} preload="auto" onEnded={() => { setState("done"); onEnded?.(); }} />
      <button
        type="button"
        aria-label="Phát audio"
        disabled={state !== "idle"}
        onClick={() => ref.current?.play().then(() => setState("playing"))}
        className="btn-neon rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
      >
        ▶ Phát
      </button>
      <span className="text-sm text-muted">
        {state === "idle" && "Audio chỉ phát một lần."}
        {state === "playing" && "Đang phát…"}
        {state === "done" && "Đã phát"}
      </span>
    </div>
  );
}
