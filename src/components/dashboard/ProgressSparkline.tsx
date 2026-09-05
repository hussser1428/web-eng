import type { ExamPoint } from "@/features/stats/load-dashboard";

type Props = { points: ExamPoint[] };

const W = 100;
const H = 32;

export function ProgressSparkline({ points }: Props) {
  if (points.length < 2) return null;

  const totals = points.map((p) => p.total);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const span = max - min || 1; // mọi lượt bằng điểm nhau thì vẽ đường ngang
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((p.total - min) / span) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const first = totals[0];
  const last = totals[totals.length - 1];
  const diff = last - first;
  const note = diff > 0 ? `tăng ${diff} điểm` : diff < 0 ? `giảm ${-diff} điểm` : "chưa đổi";

  return (
    <section className="card p-6">
      <h2 className="text-lg font-bold">Tiến bộ</h2>
      <p className="mt-1 text-sm text-muted">{points.length} lượt thi gần nhất · {note}</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-4 h-20 w-full text-accent"
        role="img"
        aria-label={`Điểm qua ${points.length} lượt thi, từ ${first} đến ${last}`}
      >
        <polyline
          points={coords.join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </section>
  );
}
