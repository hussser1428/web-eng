import Link from "next/link";
import { BrainCircuit } from "lucide-react";

/** Thẻ "Số từ đến hạn ôn" của spec mục 4.1. */
export function DueWordsCard({ due, saved }: { due: number; saved: number }) {
  return (
    <section className="card flex flex-col p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <BrainCircuit size={20} className="text-accent-text" aria-hidden="true" />
        Từ đến hạn ôn
      </h2>

      {saved === 0 ? (
        <p className="mt-3 text-muted">Bôi đen một từ tiếng Anh ở bất kỳ trang nào rồi bấm Lưu từ trong popup dịch.</p>
      ) : due > 0 ? (
        <>
          <p className="mt-3 text-5xl font-extrabold text-accent">{due}</p>
          <p className="mt-1 text-sm text-muted">trên {saved} từ đã lưu</p>
          <Link href="/vocab/flashcard" className="btn-primary mt-4 self-start rounded-lg px-5 py-2 text-sm font-semibold">
            Ôn ngay
          </Link>
        </>
      ) : (
        <>
          <p className="mt-3 text-muted">Hôm nay không còn từ nào đến hạn.</p>
          <p className="mt-1 text-sm text-muted">{saved} từ đã lưu</p>
          <Link href="/vocab" className="mt-4 self-start rounded-lg border border-line px-5 py-2 text-sm font-medium hover:bg-surface-2">
            Xem sổ tay
          </Link>
        </>
      )}
    </section>
  );
}
