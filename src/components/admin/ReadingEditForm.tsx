"use client";

import { useActionState, useState } from "react";
import { updateReadingAction } from "@/app/admin/actions";
import { inputClass, labelClass, primaryButtonClass } from "@/components/layout/AuthCard";
import { GENRES, GENRE_LABELS, LEVELS, LEVEL_LABELS } from "@/features/reading/labels";
import type { ReadingAdminDetail } from "@/features/reading/admin/get-reading-admin";

type Cau = { en: string; vi: string };

const nutPhu = "rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2";

/**
 * Sửa một bài đọc: các ô nhập câu là state trong client, khi gửi thì đóng gói thành một JSON ẩn.
 * Nhờ vậy Server Action chỉ phải parse một trường thay vì ghép lại từ hàng trăm tên ô rời rạc.
 */
export function ReadingEditForm({ reading }: { reading: ReadingAdminDetail }) {
  const [loi, action, dangGui] = useActionState(updateReadingAction, null);
  const [doan, setDoan] = useState<Cau[][]>(() => reading.paragraphs.map((p) => p.map((s) => ({ en: s.en, vi: s.vi }))));

  /** Mọi thao tác thêm/xoá đều đi qua đây để React thấy mảng mới. */
  function doi(f: (d: Cau[][]) => Cau[][]) {
    setDoan((d) => f(d.map((p) => p.map((s) => ({ ...s })))));
  }

  return (
    <form action={action} className="card flex flex-col gap-4 p-5" data-no-translate>
      <input type="hidden" name="id" value={reading.id} />
      <input type="hidden" name="paragraphs" value={JSON.stringify(doan)} />

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Tiêu đề</span>
        <input name="title" defaultValue={reading.title} className={inputClass} />
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelClass}>Thể loại</span>
          <select name="genre" defaultValue={reading.genre} className={inputClass}>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {GENRE_LABELS[g]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={labelClass}>Độ khó</span>
          <select name="level" defaultValue={reading.level} className={inputClass}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Tên nguồn</span>
        <input name="sourceName" defaultValue={reading.sourceName} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Đường dẫn nguồn</span>
        <input name="sourceUrl" type="url" defaultValue={reading.sourceUrl ?? ""} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Giấy phép</span>
        <input name="license" defaultValue={reading.license} className={inputClass} />
      </label>

      {doan.map((cauTrongDoan, i) => (
        <fieldset key={i} className="flex flex-col gap-3 rounded-xl border border-line p-4">
          <legend className={labelClass}>Đoạn {i + 1}</legend>

          {cauTrongDoan.map((cau, j) => (
            <div key={j} className="flex flex-col gap-2 sm:flex-row">
              <textarea
                rows={2}
                aria-label={`Đoạn ${i + 1} câu ${j + 1} tiếng Anh`}
                value={cau.en}
                onChange={(e) =>
                  doi((d) => {
                    d[i][j].en = e.target.value;
                    return d;
                  })
                }
                className={inputClass}
              />
              <textarea
                rows={2}
                aria-label={`Đoạn ${i + 1} câu ${j + 1} tiếng Việt`}
                value={cau.vi}
                onChange={(e) =>
                  doi((d) => {
                    d[i][j].vi = e.target.value;
                    return d;
                  })
                }
                className={inputClass}
              />
              <button
                type="button"
                aria-label={`Xoá câu ${j + 1} của đoạn ${i + 1}`}
                onClick={() =>
                  doi((d) => {
                    d[i].splice(j, 1);
                    return d;
                  })
                }
                className={`${nutPhu} text-danger sm:self-start`}
              >
                Xoá câu
              </button>
            </div>
          ))}

          <div className="flex gap-3">
            <button
              type="button"
              aria-label={`Thêm câu vào đoạn ${i + 1}`}
              onClick={() =>
                doi((d) => {
                  d[i].push({ en: "", vi: "" });
                  return d;
                })
              }
              className={nutPhu}
            >
              Thêm câu
            </button>
            <button
              type="button"
              aria-label={`Xoá đoạn ${i + 1}`}
              onClick={() =>
                doi((d) => {
                  d.splice(i, 1);
                  return d;
                })
              }
              className={`${nutPhu} text-danger`}
            >
              Xoá đoạn
            </button>
          </div>
        </fieldset>
      ))}

      <button type="button" onClick={() => doi((d) => [...d, [{ en: "", vi: "" }]])} className={`${nutPhu} sm:w-40`}>
        Thêm đoạn
      </button>

      {loi && <p className="text-sm text-danger">{loi}</p>}

      <button disabled={dangGui} className={`${primaryButtonClass} sm:w-40`}>
        Lưu
      </button>
    </form>
  );
}
