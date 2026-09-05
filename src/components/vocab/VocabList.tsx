"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { dueLabel } from "./due-label";

export type VocabListItem = {
  wordId: string;
  headword: string;
  phonetic: string | null;
  pos: string | null;
  meaningVi: string;
  sourceContext: string | null;
  dueAt: string;
};

type Props = { items: VocabListItem[]; total: number; page: number; pageSize: number; q: string; now: string };

function urlCua(q: string, page: number) {
  const phan = [`q=${encodeURIComponent(q)}`];
  if (page > 1) phan.push(`page=${page}`);
  return `/vocab?${phan.join("&")}`;
}

export function VocabList({ items, total, page, pageSize, q, now }: Props) {
  const router = useRouter();
  const [tuKhoa, setTuKhoa] = useState(q);
  const [dangXoa, setDangXoa] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const mocNow = new Date(now);
  const soTrang = Math.max(1, Math.ceil(total / pageSize));

  async function xoa(wordId: string) {
    setDangXoa(wordId);
    setLoi(null);
    try {
      const res = await fetch(`/api/vocab/saved/${wordId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("fail");
      router.refresh();
    } catch {
      setLoi("Không xoá được, thử lại sau.");
    } finally {
      setDangXoa(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(urlCua(tuKhoa, 1));
        }}
      >
        <label htmlFor="tim-tu" className="sr-only">
          Tìm từ đã lưu
        </label>
        <input
          id="tim-tu"
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
          placeholder="Tìm theo từ hoặc nghĩa"
          className="flex-1 rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm outline-none focus:border-accent"
        />
        <button type="submit" className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold">
          Tìm
        </button>
      </form>

      {loi && <p className="text-sm text-danger">{loi}</p>}

      {items.length === 0 ? (
        <p className="card p-6 text-muted">
          {q
            ? `Không tìm thấy từ nào khớp "${q}".`
            : "Chưa lưu từ nào. Bôi đen một từ tiếng Anh ở bất kỳ trang nào rồi bấm Lưu từ trong popup dịch."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((t) => (
            <li key={t.wordId} className="card flex items-start gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="text-lg font-bold">{t.headword}</span>
                  {t.phonetic && <span className="text-sm text-muted">{t.phonetic}</span>}
                  {t.pos && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">{t.pos}</span>}
                </p>
                <p className="mt-1">{t.meaningVi}</p>
                {t.sourceContext && <p className="mt-1 text-sm italic text-muted">{t.sourceContext}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-xs text-muted">{dueLabel(t.dueAt, mocNow)}</span>
                <button
                  type="button"
                  aria-label={`Xoá từ ${t.headword}`}
                  onClick={() => xoa(t.wordId)}
                  disabled={dangXoa === t.wordId}
                  className="rounded-lg border border-line p-2 text-muted hover:bg-surface-2 hover:text-danger disabled:opacity-50"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => router.push(urlCua(q, page - 1))}
            className="rounded-lg border border-line px-4 py-2 hover:bg-surface-2 disabled:opacity-40"
          >
            Trang trước
          </button>
          <span className="text-muted">
            Trang {page}/{soTrang}
          </span>
          <button
            type="button"
            disabled={page >= soTrang}
            onClick={() => router.push(urlCua(q, page + 1))}
            className="rounded-lg border border-line px-4 py-2 hover:bg-surface-2 disabled:opacity-40"
          >
            Trang sau
          </button>
        </div>
      )}
    </section>
  );
}
