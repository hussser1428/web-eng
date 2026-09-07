import Link from "next/link";
import { GENRES, GENRE_LABELS, LEVELS, LEVEL_LABELS } from "@/features/reading/labels";
import { inputClass, labelClass } from "@/components/layout/AuthCard";

type Props = { genre?: string; level?: string };

/** Bộ lọc thể loại/độ khó cho danh sách bài đọc: form GET nên bộ lọc nằm trên URL, chia sẻ và tải lại được. */
export function ReadingFilters({ genre = "", level = "" }: Props) {
  const dangLoc = genre !== "" || level !== "";
  return (
    <form method="GET" action="/reading" className="card flex flex-wrap items-end gap-3 p-4">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Thể loại</span>
        <select name="genre" defaultValue={genre} className={inputClass}>
          <option value="">Tất cả</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {GENRE_LABELS[g]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Độ khó</span>
        <select name="level" defaultValue={level} className={inputClass}>
          <option value="">Tất cả</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABELS[l]}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold">
        Lọc
      </button>

      {dangLoc && (
        <Link href="/reading" className="text-sm text-muted hover:text-foreground">
          Bỏ lọc
        </Link>
      )}
    </form>
  );
}
