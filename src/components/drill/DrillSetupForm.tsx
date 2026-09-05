"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { sections: { id: string; name: string }[]; defaultSection?: string; defaultTag?: string };
const COUNTS = [10, 20, 30] as const;

export function DrillSetupForm({ sections, defaultSection, defaultTag }: Props) {
  const router = useRouter();
  // Tham số trên URL có thể sai; chỉ nhận khi phần đó thật sự tồn tại
  const known = defaultSection && sections.some((s) => s.id === defaultSection) ? defaultSection : null;
  const [section, setSection] = useState(known ?? sections[0]?.id ?? "");
  const [tag, setTag] = useState<string | null>(defaultTag ?? null);
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const body = tag ? { section, count, skillTags: [tag] } : { section, count };
      const res = await fetch("/api/drill/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
    `rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${active ? "border-accent bg-accent/15" : "border-line hover:bg-surface-2"}`;

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
      {tag && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
          <span>Lọc theo kỹ năng: <span className="font-semibold">{tag}</span></span>
          <button type="button" onClick={() => setTag(null)} className="ml-auto text-xs font-semibold text-info hover:underline">
            Bỏ lọc kỹ năng
          </button>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="button" onClick={start} disabled={pending || !section} className="btn-primary rounded-lg px-6 py-3 font-bold disabled:opacity-50">
        Bắt đầu luyện
      </button>
    </div>
  );
}
