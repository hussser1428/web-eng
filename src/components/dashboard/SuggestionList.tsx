import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Suggestion } from "@/features/stats/load-dashboard";

type Props = { suggestions: Suggestion[] };

export function SuggestionList({ suggestions }: Props) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-bold">Gợi ý hôm nay</h2>
      {suggestions.length === 0 ? (
        <p className="mt-2 text-muted">Làm thêm câu hỏi để biết mình yếu chỗ nào. Mỗi kỹ năng cần ít nhất 5 câu đã làm mới được xét.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {suggestions.map((s) => (
            <li key={s.tag}>
              <Link
                href={`/drill?section=${encodeURIComponent(s.section)}&tag=${encodeURIComponent(s.tag)}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3 transition hover:border-accent/60"
              >
                <span>
                  <span className="font-semibold">{s.tag}</span>
                  <span className="block text-xs text-muted">{s.sectionName} · đúng {Math.round(s.rate * 100)}% trong {s.total} câu</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-accent-text" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
