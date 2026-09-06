"use client";

import { useState } from "react";
import Link from "next/link";
import type { QuizItem } from "@/features/vocab/start-session";

type KetQua = { isCorrect: boolean; correctText: string };

export function QuizSession({ items, early }: { items: QuizItem[]; early: boolean }) {
  const [idx, setIdx] = useState(0);
  const [ketQua, setKetQua] = useState<KetQua | null>(null);
  const [chon, setChon] = useState<string | null>(null);
  const [dung, setDung] = useState(0);
  const [pending, setPending] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [xongHet, setXongHet] = useState(false);

  if (items.length === 0) {
    return (
      <section className="card p-8 text-center">
        <p className="text-muted">Chưa đủ từ để dựng câu trắc nghiệm. Sổ tay cần thêm từ cùng loại từ.</p>
        <Link href="/vocab/flashcard" className="btn-primary mt-4 inline-block rounded-lg px-5 py-2 text-sm font-semibold">
          Ôn thẻ thay vào đó
        </Link>
      </section>
    );
  }

  if (xongHet) {
    return (
      <section className="card p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted">Kết quả</p>
        <p className="mt-3 text-6xl font-extrabold text-accent">
          {dung}/{items.length}
        </p>
        <Link href="/vocab" className="btn-primary mt-6 inline-block rounded-lg px-5 py-2 text-sm font-semibold">
          Về sổ tay
        </Link>
      </section>
    );
  }

  const cau = items[idx];
  const laCuoi = idx === items.length - 1;

  async function traLoi(chosen: string) {
    if (ketQua || pending) return;
    setChon(chosen);
    setPending(true);
    setLoi(null);
    try {
      const res = await fetch("/api/vocab/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: cau.wordId, chosen, direction: cau.direction }),
      });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as KetQua;
      setKetQua(data);
      if (data.isCorrect) setDung((n) => n + 1);
    } catch {
      setChon(null);
      setLoi("Không gửi được câu trả lời. Hãy chọn lại.");
    } finally {
      setPending(false);
    }
  }

  function tiep() {
    if (laCuoi) {
      setXongHet(true);
      return;
    }
    setIdx((i) => i + 1);
    setKetQua(null);
    setChon(null);
  }

  const classCua = (text: string) => {
    if (!ketQua) return "border-line hover:bg-surface-2";
    if (text === ketQua.correctText) return "border-emerald-400/60 bg-emerald-400/10";
    if (text === chon) return "border-danger/60 bg-danger/10";
    return "border-line opacity-60";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Câu {idx + 1}/{items.length}
        </span>
        {early && <span>Bạn đang ôn sớm — lịch ôn sẽ không bị đẩy xa thêm.</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>

      <section className="card flex flex-col gap-4 p-6">
        <p className="text-sm text-muted">{cau.direction === "EN_TO_VI" ? "Chọn nghĩa tiếng Việt đúng" : "Chọn từ tiếng Anh đúng"}</p>
        <p className="text-center text-3xl font-extrabold">{cau.prompt}</p>
        {cau.phonetic && <p className="text-center text-muted">{cau.phonetic}</p>}

        <div className="grid gap-2 sm:grid-cols-2">
          {cau.choices.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => traLoi(c)}
              disabled={ketQua !== null || pending}
              className={`rounded-xl border px-4 py-3 text-left transition disabled:cursor-default ${classCua(c)}`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {loi && <p className="text-center text-sm text-danger">{loi}</p>}

      {ketQua && (
        <>
          <p className={`text-center text-lg font-bold ${ketQua.isCorrect ? "text-emerald-300" : "text-danger"}`}>
            {ketQua.isCorrect ? "Chính xác!" : `Chưa đúng — đáp án là ${ketQua.correctText}`}
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={tiep} className="btn-primary rounded-lg px-6 py-2.5 font-semibold">
              {laCuoi ? "Xem kết quả" : "Câu tiếp"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
