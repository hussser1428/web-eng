import { TOEIC } from "@/features/certificates";

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

type Props = { section?: string; status?: string; source?: string; q?: string; missingAudio?: boolean };

/** Bộ lọc danh sách câu hỏi: form GET nên bộ lọc nằm luôn trên URL, chia sẻ và tải lại được. */
export function QuestionFilters({ section = "", status = "", source = "", q = "", missingAudio = false }: Props) {
  return (
    <form method="GET" className="card flex flex-wrap items-end gap-3 p-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Phần thi</span>
        <select name="section" defaultValue={section} className={selectClass}>
          <option value="">Tất cả phần thi</option>
          {TOEIC.sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

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
        <span className="text-xs text-muted">Tìm trong đề bài</span>
        <input
          name="q"
          defaultValue={q}
          placeholder="Một phần đề bài"
          className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="flex items-center gap-2 py-2 text-sm">
        <input type="checkbox" name="missingAudio" value="1" defaultChecked={missingAudio} className="size-4" />
        Thiếu audio
      </label>

      <button type="submit" className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold">
        Lọc
      </button>
    </form>
  );
}
