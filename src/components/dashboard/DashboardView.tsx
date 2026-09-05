import Link from "next/link";
import type { Dashboard } from "@/features/stats/load-dashboard";
import { ScoreCard } from "./ScoreCard";
import { ProgressSparkline } from "./ProgressSparkline";
import { WeaknessBars } from "./WeaknessBars";
import { SuggestionList } from "./SuggestionList";

type Props = { name: string; data: Dashboard };

/** Thẻ thay chỗ đường tiến bộ khi chưa đủ hai lượt thi để vẽ. */
function QuickActions() {
  return (
    <section className="card flex flex-col p-6">
      <h2 className="text-lg font-bold">Bắt đầu từ đâu</h2>
      <p className="mt-2 text-muted">Thi thử một đề để có điểm ước tính, hoặc luyện từng Part để làm quen dạng câu hỏi.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/exam" className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold">Thi thử</Link>
        <Link href="/drill" className="rounded-lg border border-line px-5 py-2 text-sm font-medium hover:bg-surface-2">Luyện tập</Link>
      </div>
    </section>
  );
}

export function DashboardView({ name, data }: Props) {
  const sectionItems = data.bySection.map((s) => ({ key: s.key, label: s.name, correct: s.correct, total: s.total, rate: s.rate }));
  const tagItems = data.byTag.map((t) => ({ key: t.key, label: t.key, correct: t.correct, total: t.total, rate: t.rate }));

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-2">
        <h1 className="text-3xl font-extrabold">
          Chào <span className="text-accent">{name}</span>
        </h1>
        <p className="mt-1 text-muted">
          {data.answered === 0
            ? "Bạn chưa làm câu nào. Bắt đầu bằng một lượt luyện tập nhé."
            : `Bạn đã làm ${data.answered} câu trong 30 ngày qua.`}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <ScoreCard latest={data.latest} />
        {data.history.length >= 2 ? <ProgressSparkline points={data.history} /> : <QuickActions />}
      </div>

      <SuggestionList suggestions={data.suggestions} />

      <div className="grid gap-4 md:grid-cols-2">
        <WeaknessBars title="Theo phần thi" items={sectionItems} emptyText="Chưa có câu nào trong 30 ngày qua." />
        <WeaknessBars title="Theo kỹ năng" items={tagItems} emptyText="Mỗi kỹ năng cần ít nhất 5 câu đã làm mới được thống kê." />
      </div>
    </div>
  );
}
