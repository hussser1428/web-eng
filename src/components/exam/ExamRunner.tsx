"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AttemptForClient } from "@/features/attempts/get-attempt";
import type { SectionSpec } from "@/features/certificates";
import { QuestionCard } from "@/components/questions/QuestionCard";
import { ExamTimer } from "./ExamTimer";

type Props = { attempt: AttemptForClient; sections: SectionSpec[]; timeLimits: { listening: number; reading: number } };

const SYNC_MS = 30_000;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* bỏ qua khi storage bị chặn */ }
}

export function ExamRunner({ attempt, sections, timeLimits }: Props) {
  const router = useRouter();
  const qs = attempt.questions;
  const K = useMemo(() => ({ answers: `attempt:${attempt.id}:answers`, flags: `attempt:${attempt.id}:flags`, reading: `attempt:${attempt.id}:readingStartedAt` }), [attempt.id]);
  const skillOf = useMemo(() => new Map(sections.map((s) => [s.id, s.skill])), [sections]);
  const nameOf = useMemo(() => new Map(sections.map((s) => [s.id, s.name])), [sections]);

  const listeningQs = qs.filter((q) => skillOf.get(q.section) === "listening");
  const readingQs = qs.filter((q) => skillOf.get(q.section) !== "listening");

  // Khởi tạo CHỈ từ dữ liệu server để HTML server và render client đầu tiên giống nhau.
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const fromServer: Record<string, number> = {};
    for (const q of qs) if (q.chosen !== null) fromServer[q.id] = q.chosen;
    return fromServer;
  });
  const [flags, setFlags] = useState<string[]>([]);
  const [readingStartedAt, setReadingStartedAt] = useState<number | null>(
    () => (listeningQs.length === 0 ? new Date(attempt.startedAt).getTime() : null),
  );
  const [hydrated, setHydrated] = useState(false);

  // Sau khi mount mới đọc localStorage: bản lưu ở client mới hơn nên ghi đè dữ liệu server.
  useEffect(() => {
    setAnswers((fromServer) => ({ ...fromServer, ...readJson<Record<string, number>>(K.answers, {}) }));
    setFlags(readJson<string[]>(K.flags, []));
    const saved = readJson<number | null>(K.reading, null);
    if (saved) setReadingStartedAt(saved);
    setHydrated(true);
  }, [K]);

  const phase: "listening" | "reading" = readingStartedAt === null ? "listening" : "reading";
  const visible = phase === "listening" ? listeningQs : readingQs;

  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const payload = useCallback(() => qs.map((q) => ({ questionId: q.id, chosen: answersRef.current[q.id] ?? null })), [qs]);

  // Đồng bộ định kỳ
  useEffect(() => {
    const id = setInterval(() => {
      fetch(`/api/attempts/${attempt.id}/answers`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: payload() }) }).catch(() => {});
    }, SYNC_MS);
    return () => clearInterval(id);
  }, [attempt.id, payload]);

  function choose(qid: string, i: number) {
    setAnswers((a) => {
      const next = { ...a, [qid]: i };
      writeJson(K.answers, next);
      return next;
    });
  }
  function toggleFlag(qid: string) {
    setFlags((f) => {
      const next = f.includes(qid) ? f.filter((x) => x !== qid) : [...f, qid];
      writeJson(K.flags, next);
      return next;
    });
  }
  function startReading() {
    const now = Date.now();
    writeJson(K.reading, now);
    setReadingStartedAt(now);
    setIdx(0);
  }

  const submit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attempt.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: payload() }) });
      if (!res.ok && res.status !== 409) throw new Error("fail");
      localStorage.removeItem(K.answers);
      localStorage.removeItem(K.flags);
      localStorage.removeItem(K.reading);
      router.push(`/attempts/${attempt.id}/result`);
    } catch {
      setError("Không nộp được bài. Kiểm tra mạng rồi bấm Nộp bài lại; đáp án của bạn vẫn được giữ.");
      setSubmitting(false);
    }
  }, [attempt.id, payload, router, submitting, K]);

  const onExpire = useCallback(() => { void submit(); }, [submit]);

  function confirmSubmit() {
    const unanswered = qs.filter((q) => answers[q.id] === undefined).length;
    const msg = unanswered > 0 ? `Còn ${unanswered} câu chưa trả lời. Nộp bài ngay?` : "Nộp bài ngay?";
    if (window.confirm(msg)) void submit();
  }

  // Chưa đọc xong localStorage thì giữ chỗ trung tính, tránh nhấp nháy nội dung sai.
  if (!hydrated) return <div className="card p-5 text-muted">Đang tải đề…</div>;

  const q = visible[idx];
  if (!q) return <p className="text-muted">Đề này không có câu hỏi.</p>;
  const deadline = readingStartedAt !== null ? readingStartedAt + timeLimits.reading * 60_000 : null;
  const answeredCount = Object.keys(answers).length;

  return (
    <div data-no-translate className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex-1 space-y-4">
        <header className="card flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{phase === "listening" ? "Phần nghe" : "Phần đọc"}</p>
            <p className="text-sm text-muted">{nameOf.get(q.section) ?? q.section}</p>
          </div>
          {deadline !== null ? <ExamTimer deadline={deadline} onExpire={onExpire} /> : <span className="text-sm text-muted">Nghe theo audio</span>}
        </header>

        <QuestionCard key={q.id} q={q} index={q.order} selected={answers[q.id] ?? null} onSelect={(i) => choose(q.id, i)} autoPlayAudio={phase === "listening"} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => toggleFlag(q.id)} className={`rounded-full border px-4 py-2 text-sm font-medium ${flags.includes(q.id) ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-line hover:bg-white/5"}`}>
            {flags.includes(q.id) ? "Bỏ đánh dấu" : "Đánh dấu xem lại"}
          </button>
          <div className="flex gap-2">
            <button type="button" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)} className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-white/5 disabled:opacity-40">Trước</button>
            {idx < visible.length - 1 ? (
              <button type="button" onClick={() => setIdx((i) => i + 1)} className="btn-neon rounded-full px-4 py-2 text-sm font-semibold">Câu tiếp</button>
            ) : phase === "listening" ? (
              <button type="button" onClick={startReading} className="btn-neon rounded-full px-4 py-2 text-sm font-semibold">Chuyển sang phần đọc</button>
            ) : null}
          </div>
        </div>
        {error && <p className="text-sm text-neon-pink">{error}</p>}
      </div>

      <aside className="card w-full p-4 lg:sticky lg:top-20 lg:w-72">
        <p className="text-sm text-muted">Đã trả lời <span className="font-semibold text-foreground">{answeredCount}/{qs.length}</span></p>
        <div className="mt-3 grid grid-cols-6 gap-1.5 lg:grid-cols-5">
          {visible.map((v, i) => {
            const done = answers[v.id] !== undefined;
            const flagged = flags.includes(v.id);
            return (
              <button
                key={v.id}
                type="button"
                aria-label={`Tới câu ${v.order}`}
                data-flagged={flagged}
                onClick={() => setIdx(i)}
                className={`relative h-9 rounded-lg text-xs font-semibold ${i === idx ? "ring-2 ring-neon-cyan" : ""} ${done ? "bg-neon-violet/40" : "bg-surface-2"} ${flagged ? "outline outline-1 outline-amber-400" : ""}`}
              >
                {v.order}
              </button>
            );
          })}
        </div>
        {phase === "reading" && (
          <button type="button" onClick={confirmSubmit} disabled={submitting} className="btn-neon mt-4 w-full rounded-full px-4 py-2.5 font-bold disabled:opacity-50">
            {submitting ? "Đang nộp…" : "Nộp bài"}
          </button>
        )}
      </aside>
    </div>
  );
}
