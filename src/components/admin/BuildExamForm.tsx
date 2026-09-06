"use client";

import { useActionState } from "react";
import { buildExamAction } from "@/app/admin/actions";
import { inputClass, labelClass, primaryButtonClass } from "@/components/layout/AuthCard";

export function BuildExamForm() {
  const [ketQua, action, dangGui] = useActionState(buildExamAction, null);

  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Tên đề</span>
        <input name="title" placeholder="Đề TOEIC số 1" className={inputClass} />
      </label>

      {ketQua && !ketQua.ok && (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-sm font-semibold text-danger">{ketQua.message}</p>
          {ketQua.shortage && (
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 font-medium">Part</th>
                  <th className="py-1 font-medium">Cần</th>
                  <th className="py-1 font-medium">Có</th>
                </tr>
              </thead>
              <tbody>
                {ketQua.shortage.map((s) => (
                  <tr key={s.section} className="border-t border-line">
                    <td className="py-1">{s.name}</td>
                    <td className="py-1">{s.need}</td>
                    <td className="py-1 text-danger">{s.have}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {ketQua?.ok && (
        <div className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
          <p className="font-semibold text-info">Đã ghép xong đề mới, đang ở trạng thái nháp.</p>
          {/* Đề nháp chưa mở được ở /exam/[id], phải đăng ở bảng bên dưới trước. */}
          <p className="mt-1">Đã tạo đề nháp — đăng ở bảng bên dưới rồi mới mở được.</p>
        </div>
      )}

      <button disabled={dangGui} className={`${primaryButtonClass} sm:w-48`}>
        Ghép tự động
      </button>
    </form>
  );
}
