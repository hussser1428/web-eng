import Link from "next/link";
import type { ReadingListItem } from "@/features/reading/list-readings";
import { GENRE_LABELS } from "@/features/reading/labels";

type Props = { item: ReadingListItem };

/** Thẻ tóm tắt một bài đọc trong danh sách: thể loại, độ khó, số từ và thời gian đọc ước tính. */
export function ReadingCard({ item }: Props) {
  const phut = Math.max(1, Math.round(item.wordCount / 150));
  return (
    <Link href={`/reading/${item.id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:border-accent/60">
      <h2 className="text-lg font-bold">{item.title}</h2>
      <p className="mt-1 text-sm text-muted">
        {GENRE_LABELS[item.genre]} · {item.level} · {item.wordCount} từ · ~{phut} phút
      </p>
    </Link>
  );
}
