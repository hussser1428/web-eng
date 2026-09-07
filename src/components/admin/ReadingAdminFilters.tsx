import { GENRES, GENRE_LABELS } from "@/features/reading/labels";

const TRANG_THAI = [
  { value: "DRAFT", label: "Nháp" },
  { value: "PUBLISHED", label: "Đã đăng" },
];

const NGUON = [
  { value: "AI", label: "AI" },
  { value: "IMPORT", label: "Nhập file" },
  { value: "MANUAL", label: "Tự soạn" },
];

const selectClass = "rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent";

type Props = { status?: string; genre?: string; source?: string; q?: string };

/** Bộ lọc danh sách bài đọc: form GET nên bộ lọc nằm luôn trên URL, chia sẻ và tải lại được. */
export function ReadingAdminFilters({ status = "", genre = "", source = "", q = "" }: Props) {
  return (
    <form method="GET" className="card flex flex-wrap items-end gap-3 p-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Trạng thái</span>
        <select name="status" defaultValue={status} className={selectClass}>
          <option value="">Tất cả trạng thái</option>
          {TRANG_THAI.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Thể loại</span>
        <select name="genre" defaultValue={genre} className={selectClass}>
          <option value="">Mọi thể loại</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {GENRE_LABELS[g]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Nguồn</span>
        <select name="source" defaultValue={source} className={selectClass}>
          <option value="">Mọi nguồn</option>
          {NGUON.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-52 flex-1 flex-col gap-1">
        <span className="text-xs text-muted">Tìm trong tiêu đề</span>
        <input
          name="q"
          defaultValue={q}
          placeholder="Một phần tiêu đề"
          className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <button type="submit" className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold">
        Lọc
      </button>
    </form>
  );
}
