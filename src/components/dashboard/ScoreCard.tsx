import Link from "next/link";
import type { Dashboard } from "@/features/stats/load-dashboard";

type Props = { latest: Dashboard["latest"] };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ScoreCard({ latest }: Props) {
  if (!latest) {
    return (
      <section className="card p-6">
        <h2 className="text-lg font-bold">Điểm ước tính</h2>
        <p className="mt-2 text-muted">Chưa có lượt thi thử nào. Làm một đề để biết mình đang ở đâu.</p>
        <Link href="/exam" className="btn-primary mt-4 inline-block rounded-lg px-5 py-2 text-sm font-semibold">
          Thi thử ngay
        </Link>
      </section>
    );
  }

  const listening = latest.scores.parts.listening ?? 0;
  const reading = latest.scores.parts.reading ?? 0;
  return (
    <section className="card p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">Điểm ước tính</h2>
        <span className="text-xs text-muted">Thi ngày {fmtDate(latest.submittedAt)}</span>
      </div>
      <p className="mt-3 text-5xl font-extrabold text-accent">{latest.scores.total}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
          <dt className="text-muted">Nghe</dt>
          <dd className="text-xl font-bold">{listening}</dd>
        </div>
        <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
          <dt className="text-muted">Đọc</dt>
          <dd className="text-xl font-bold">{reading}</dd>
        </div>
      </dl>
      <Link href={`/attempts/${latest.attemptId}/result`} className="mt-4 inline-block text-sm font-semibold text-info hover:underline">
        Xem bài làm
      </Link>
    </section>
  );
}
