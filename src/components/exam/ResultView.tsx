"use client";

import { useState } from "react";
import Link from "next/link";
import type { AttemptResult } from "@/features/attempts/get-result";
import { QuestionCard } from "@/components/questions/QuestionCard";

export function ResultView({ result }: { result: AttemptResult }) {
  const [onlyWrong, setOnlyWrong] = useState(false);
  const shown = onlyWrong ? result.questions.filter((q) => !q.isCorrect) : result.questions;
  const isExam = result.type === "EXAM";

  return (
    <div className="flex flex-col gap-6">
      <section className="card relative overflow-hidden p-6 md:p-8">
        <div className="glow -top-20 -right-10 h-60 w-60 bg-neon-violet" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted">{isExam ? "Kết quả thi thử" : "Kết quả luyện tập"}</p>
            {isExam && result.scores ? (
              <>
                <p className="mt-2 text-6xl font-extrabold text-neon">{result.scores.total}</p>
                <p className="mt-1 text-sm text-muted">Điểm ước tính (tối đa 990)</p>
              </>
            ) : (
              <p className="mt-2 text-6xl font-extrabold text-neon">{result.correct}/{result.total}</p>
            )}
            {result.overtime && <span className="mt-3 inline-block rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">Nộp quá giờ</span>}
          </div>
          {isExam && result.scores && (
            <dl className="flex gap-6">
              {Object.entries(result.scores.parts).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-surface-2 px-5 py-3 text-center">
                  <dt className="text-xs uppercase tracking-wider text-muted">{k === "listening" ? "Nghe" : k === "reading" ? "Đọc" : k}</dt>
                  <dd className="text-2xl font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-bold">Theo phần</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {result.bySection.map((s) => (
            <li key={s.section} className="flex items-center justify-between py-2">
              <span>{s.name}</span>
              <span className="font-semibold">{s.correct}/{s.total}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} className="h-4 w-4 accent-[#ec4899]" aria-label="Chỉ hiện câu sai" />
          Chỉ hiện câu sai
        </label>
        <div className="flex gap-2">
          {isExam ? (
            <Link href="/exam" className="btn-neon rounded-full px-5 py-2 text-sm font-semibold">Chọn đề khác</Link>
          ) : (
            <Link href="/drill" className="btn-neon rounded-full px-5 py-2 text-sm font-semibold">Luyện tiếp</Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {shown.map((q) => (
          <QuestionCard key={q.id} q={q} index={q.order} selected={q.chosen} disabled reveal={{ answer: q.answer, explanation: q.explanation }} />
        ))}
        {shown.length === 0 && <p className="text-center text-muted">Không có câu sai. Xuất sắc! 🎉</p>}
      </div>
    </div>
  );
}
