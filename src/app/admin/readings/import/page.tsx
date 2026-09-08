import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { requireAdmin } from "@/lib/require-admin";
import { ReadingImportForm } from "@/components/admin/ReadingImportForm";

export const metadata: Metadata = { title: "Nhập bài đọc" };

export default async function AdminReadingImportPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <Upload size={26} className="text-accent-text" aria-hidden="true" />
          Nhập bài đọc từ JSON
        </h1>
        <p className="mt-2 text-muted">
          Dán nội dung hoặc chọn file. Bài nhập vào mặc định là nháp, phải đăng ở trang Bài đọc mới hiện cho người học.
        </p>
      </header>

      <section className="card p-5 text-sm">
        <h2 className="font-semibold">Cấu trúc file</h2>
        <ul className="mt-2 list-disc pl-5 text-muted">
          <li>
            <code>title</code>, <code>sourceName</code>, <code>license</code> — bắt buộc; <code>sourceUrl</code> tuỳ
            chọn.
          </li>
          <li>
            <code>genre</code> — <code>HUMOR</code>, <code>FAIRY_TALE</code>, <code>ANIME</code> hoặc <code>NEWS</code>;{" "}
            <code>level</code> — <code>A2</code>, <code>B1</code>, <code>B2</code> hoặc <code>C1</code>.
          </li>
          <li>
            <code>paragraphs</code> — mảng các đoạn, mỗi đoạn là mảng câu <code>{`{ "en": "...", "vi": "..." }`}</code>.
            Một câu tiếng Anh đi với đúng một câu tiếng Việt để hai cột thẳng hàng.
          </li>
        </ul>
        <p className="mt-2 text-muted">
          File mẫu: <code>prisma/seed/fixtures/reading-sample.json</code>.
        </p>
      </section>

      <ReadingImportForm />
    </div>
  );
}
