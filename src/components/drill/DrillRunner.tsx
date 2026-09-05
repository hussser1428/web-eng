"use client";

import { useState } from "react";
import Link from "next/link";
import type { AttemptForClient } from "@/features/attempts/get-attempt";
import { QuestionCard } from "@/components/questions/QuestionCard";

type Reveal = { isCorrect: boolean; answer: number; explanation: string };
type Summary = { correct: number; total: number };

export function DrillRunner({ attempt }: { attempt: AttemptForClient }) {
  const qs = attempt.questions;
  const allAnswered = qs.every((q) => q.chosen !== null);
  const firstUnanswered = Math.max(0, qs.findIndex((q) => q.chosen === null));
  const [idx, setIdx] = useState(allAnswered ? qs.length - 1 : firstUnanswered);
  const [selected, setSelected] = useState<number | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const q = qs[idx];
  const isLast = idx === qs.length - 1;

  async function choose(i: number) {
    if (reveal || pending) return;
    setSelected(i);
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attempt.id}/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: q.id, chosen: i }),
      });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as Reveal;
      setReveal(data);
      if (data.isCorrect) setCorrectCount((n) => n + 1);
    } catch {
      setSelected(null);
      setError("Không gửi được câu trả lời. Hãy chọn lại.");
    } finally {
      setPending(false);
    }
  }

  function next() {
    setIdx((i) => i + 1);
    setSelected(null);
    setReveal(null);
  }

  async function finish() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attempt.id}/submit`, { method: "POST" });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as Summary;
      setSummary(data);
    } catch {
      setError("Không nộp được. Thử lại.");
    } finally {
      setPending(false);
    }
  }

  if (summary) {
    const pct = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0;
    return (
      <section className="card relative mx-auto max-w-lg overflow-hidden p-8 text-center">
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted">Kết quả luyện tập</p>
          <p className="mt-3 text-6xl font-extrabold text-accent">{summary.correct}/{summary.total}</p>
          <p className="mt-2 text-muted">{pct >= 80 ? "Tuyệt vời!" : pct >= 50 ? "Khá ổn, tiếp tục nhé." : "Xem lại giải thích rồi thử lại nào 📚"}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/drill" className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold">Luyện tiếp</Link>
            <Link href={`/attempts/${attempt.id}/result`} className="rounded-full border border-line px-5 py-2 text-sm font-semibold hover:bg-surface-2">Xem chi tiết</Link>
          </div>
        </div>
      </section>
    );
  }

  if (allAnswered) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="card flex flex-col items-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold">Bạn đã trả lời hết các câu.</p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="button" onClick={finish} disabled={pending} className="btn-primary rounded-lg px-6 py-2.5 font-semibold disabled:opacity-50">
            Xem kết quả
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Câu {idx + 1}/{qs.length}</span>
        <span>Đúng: <span className="font-semibold text-emerald-300">{correctCount}</span></span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((idx + (reveal ? 1 : 0)) / qs.length) * 100}%` }} />
      </div>
      <QuestionCard key={q.id} q={q} index={idx + 1} selected={selected} onSelect={choose} disabled={pending} reveal={reveal ? { answer: reveal.answer, explanation: reveal.explanation } : null} />
      {reveal && (
        <p className={`text-center text-lg font-bold ${reveal.isCorrect ? "text-emerald-300" : "text-danger"}`}>{reveal.isCorrect ? "Chính xác!" : "Chưa đúng"}</p>
      )}
      {error && <p className="text-center text-sm text-danger">{error}</p>}
      <div className="flex justify-end">
        {reveal && !isLast && <button type="button" onClick={next} className="btn-primary rounded-lg px-6 py-2.5 font-semibold">Câu tiếp</button>}
        {reveal && isLast && <button type="button" onClick={finish} disabled={pending} className="btn-primary rounded-lg px-6 py-2.5 font-semibold disabled:opacity-50">Xem kết quả</button>}
      </div>
    </div>
  );
}
