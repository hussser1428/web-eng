"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExamStartButton({ examId }: { examId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/exam/${examId}/start`, { method: "POST" });
      if (!res.ok) throw new Error("fail");
      const { attemptId } = (await res.json()) as { attemptId: string };
      router.push(`/exam/attempt/${attemptId}`);
    } catch {
      setError("Không bắt đầu được, thử lại sau.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={start} disabled={pending} className="btn-neon rounded-full px-6 py-3 font-bold disabled:opacity-50">
        {pending ? "Đang chuẩn bị…" : "Bắt đầu làm bài 🚀"}
      </button>
      {error && <p className="text-sm text-neon-pink">{error}</p>}
    </div>
  );
}
