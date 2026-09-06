import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { ImportForm } from "@/components/admin/ImportForm";

export const metadata: Metadata = { title: "Nhập câu hỏi" };

export default function AdminImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <Upload size={26} className="text-accent-text" aria-hidden="true" />
          Nhập câu hỏi từ JSON
        </h1>
        <p className="mt-2 text-muted">
          Dán nội dung hoặc chọn file. Câu nhập vào mặc định là nháp, phải đăng ở trang Câu hỏi mới hiện cho người học.
        </p>
      </header>

      <section className="card p-5 text-sm">
        <h2 className="font-semibold">Cấu trúc file</h2>
        <ul className="mt-2 list-disc pl-5 text-muted">
          <li>
            <code>certificate</code> — mã chứng chỉ, mặc định <code>&quot;toeic&quot;</code>.
          </li>
          <li>
            <code>groups</code> — nhóm dùng chung: <code>key</code>, <code>section</code>, <code>passage</code>,{" "}
            <code>transcript</code>, <code>audioUrl</code>, <code>imageUrl</code>.
          </li>
          <li>
            <code>questions</code> — <code>section</code>, <code>groupKey</code> (tuỳ chọn, trỏ tới <code>key</code> của
            nhóm), <code>stem</code>, <code>choices</code>, <code>answer</code> (số thứ tự từ 0), <code>explanation</code>,{" "}
            <code>skillTags</code>.
          </li>
        </ul>
        <p className="mt-2 text-muted">
          File mẫu: <code>prisma/seed/fixtures/questions-sample.json</code>.
        </p>
      </section>

      <ImportForm />
    </div>
  );
}
