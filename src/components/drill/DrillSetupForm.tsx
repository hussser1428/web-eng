"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { sections: { id: string; name: string }[] };
const COUNTS = [10, 20, 30] as const;

export function DrillSetupForm({ sections }: Props) {
  const router = useRouter();
  const [section, setSection] = useState(sections[0]?.id ?? "");
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/drill/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section, count }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === "NOT_ENOUGH_QUESTIONS" ? "Phần này chưa có câu hỏi. Hãy chọn phần khác." : "Không bắt đầu được, thử lại sau.");
        return;
      }
      router.push(`/drill/${data.attemptId}`);
    } catch {
      setError("Mất kết nối, thử lại sau.");
    } finally {
      setPending(false);
    }
  }

  const pill = (active: boolean) =>
    `rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${active ? "border-neon-violet bg-neon-violet/15" : "border-line hover:bg-white/5"}`;

  return (
    <div className="card flex flex-col gap-6 p-6">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-muted">Chọn phần</legend>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          {sections.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={section === s.id} onClick={() => setSection(s.id)} className={pill(section === s.id)}>
              {s.name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-muted">Số câu</legend>
        <div role="radiogroup" className="flex gap-2">
          {COUNTS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={count === c} aria-label={`${c} câu`} onClick={() => setCount(c)} className={pill(count === c)}>
              {c} câu
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p className="text-sm text-neon-pink">{error}</p>}
      <button type="button" onClick={start} disabled={pending || !section} className="btn-neon rounded-full px-6 py-3 font-bold disabled:opacity-50">
        Bắt đầu luyện
      </button>
    </div>
  );
}
