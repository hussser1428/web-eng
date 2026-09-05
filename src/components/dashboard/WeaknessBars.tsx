export type BarItem = { key: string; label: string; correct: number; total: number; rate: number };

type Props = { title: string; items: BarItem[]; emptyText: string };

function barColor(rate: number) {
  if (rate < 0.5) return "bg-danger";
  if (rate < 0.75) return "bg-accent";
  return "bg-emerald-400";
}

export function WeaknessBars({ title, items, emptyText }: Props) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-muted">{emptyText}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((it) => {
            const pct = Math.round(it.rate * 100);
            return (
              <li key={it.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{it.label}</span>
                  <span className="shrink-0 text-muted">{pct}% · {it.correct}/{it.total} câu</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${it.label}: đúng ${pct} phần trăm`}>
                  <div className={`h-full rounded-full ${barColor(it.rate)}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
