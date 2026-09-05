"use client";

import { useEffect, useRef, useState } from "react";

type Props = { deadline: number; onExpire: () => void };

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function ExamTimer({ deadline, onExpire }: Props) {
  // null = chưa biết. Không đọc Date.now() lúc khởi tạo để server và client render giống nhau.
  const [left, setLeft] = useState<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    const tick = () => {
      const l = deadline - Date.now();
      setLeft(l);
      if (l <= 0 && !fired.current) {
        fired.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

  const warn = left !== null && left < 5 * 60_000;
  return (
    <span role="timer" aria-live="off" className={`font-mono text-2xl font-bold tabular-nums ${warn ? "text-neon-pink" : "text-neon-cyan"}`}>
      {left === null ? "--:--" : fmt(left)}
    </span>
  );
}
