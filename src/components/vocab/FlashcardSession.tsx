"use client";

import { useState } from "react";
import Link from "next/link";
import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speak";
import type { DueWord } from "@/features/vocab/pick-due";

type Grade = "FORGOT" | "HARD" | "EASY";

const NUT: { grade: Grade; nhan: string; mau: string }[] = [
  { grade: "FORGOT", nhan: "Quên", mau: "border-danger/50 text-danger hover:bg-danger/10" },
  { grade: "HARD", nhan: "Khó", mau: "border-line hover:bg-surface-2" },
  { grade: "EASY", nhan: "Dễ", mau: "border-accent/50 text-accent hover:bg-accent/10" },
];

export function FlashcardSession({ items, early }: { items: DueWord[]; early: boolean }) {
  const [idx, setIdx] = useState(0);
  const [lat, setLat] = useState(false);
  const [pending, setPending] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [xong, setXong] = useState(0);

  if (items.length === 0) {
    return (
      <section className="card p-8 text-center">
        <p className="text-muted">Chưa có từ nào để ôn. Hãy lưu vài từ trong popup dịch trước đã.</p>
        <Link href="/vocab" className="btn-primary mt-4 inline-block rounded-lg px-5 py-2 text-sm font-semibold">
          Về sổ tay
        </Link>
      </section>
    );
  }

  if (idx >= items.length) {
    return (
      <section className="card p-8 text-center">
        <p className="text-2xl font-extrabold text-accent">Đã ôn {xong} thẻ</p>
        <p className="mt-2 text-muted">Lịch ôn của từng từ đã được cập nhật.</p>
        <Link href="/vocab" className="btn-primary mt-6 inline-block rounded-lg px-5 py-2 text-sm font-semibold">
          Về sổ tay
        </Link>
      </section>
    );
  }

  const the = items[idx];

  async function cham(grade: Grade) {
    setPending(true);
    setLoi(null);
    try {
      const res = await fetch("/api/vocab/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: the.wordId, grade }),
      });
      if (!res.ok) throw new Error("fail");
      setXong((n) => n + 1);
      setIdx((i) => i + 1);
      setLat(false);
    } catch {
      setLoi("Không lưu được kết quả, thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Thẻ {idx + 1}/{items.length}
        </span>
        {early && <span>Bạn đang ôn sớm — lịch ôn sẽ không bị đẩy xa thêm.</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>

      <section className="card flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-4xl font-extrabold">{the.headword}</p>
        <div className="flex items-center gap-3 text-muted">
          {the.phonetic && <span>{the.phonetic}</span>}
          <button
            type="button"
            aria-label={`Phát âm ${the.headword}`}
            onClick={() => speak(the.headword)}
            className="rounded-lg border border-line p-1.5 hover:bg-surface-2"
          >
            <Volume2 size={18} aria-hidden="true" />
          </button>
        </div>

        {lat && (
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-xl">{the.meaningVi}</p>
            {the.exampleEn && <p className="text-sm italic text-muted">{the.exampleEn}</p>}
            {the.exampleVi && <p className="text-sm text-muted">{the.exampleVi}</p>}
            {the.sourceContext && <p className="mt-2 text-sm text-info">Bạn lưu từ này ở: {the.sourceContext}</p>}
          </div>
        )}
      </section>

      {loi && <p className="text-center text-sm text-danger">{loi}</p>}

      {lat ? (
        <div className="grid grid-cols-3 gap-2">
          {NUT.map((n) => (
            <button
              key={n.grade}
              type="button"
              onClick={() => cham(n.grade)}
              disabled={pending}
              className={`rounded-lg border px-4 py-3 font-semibold transition disabled:opacity-50 ${n.mau}`}
            >
              {n.nhan}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => setLat(true)} className="btn-primary rounded-lg px-6 py-3 font-bold">
          Lật thẻ
        </button>
      )}
    </div>
  );
}
