"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

type Props = { src: string; autoPlay?: boolean; played?: boolean; onPlayed?: (src: string) => void; onEnded?: () => void };

/** Phát audio đúng một lần, không cho tua lại (quy tắc phòng thi). */
export function AudioOnce({ src, autoPlay = false, played = false, onPlayed, onEnded }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "done">(played ? "done" : "idle");

  useEffect(() => {
    if (autoPlay && state === "idle") {
      ref.current?.play().then(() => { setState("playing"); onPlayed?.(src); }).catch(() => {/* trình duyệt chặn autoplay: chờ người dùng bấm */});
    }
  }, [autoPlay, state, src, onPlayed]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
      <audio ref={ref} src={src} preload="auto" onEnded={() => { setState("done"); onEnded?.(); }} />
      <button
        type="button"
        aria-label="Phát audio"
        disabled={state !== "idle"}
        onClick={() => ref.current?.play().then(() => { setState("playing"); onPlayed?.(src); })}
        className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
      >
        <Play size={16} aria-hidden="true" /> Phát
      </button>
      <span className="text-sm text-muted">
        {state === "idle" && "Audio chỉ phát một lần."}
        {state === "playing" && "Đang phát…"}
        {state === "done" && "Đã phát"}
      </span>
    </div>
  );
}
