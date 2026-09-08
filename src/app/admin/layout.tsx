import type { Metadata } from "next";
import { requireAdmin } from "@/lib/require-admin";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: "Quản trị" };

const ADMIN_LINKS = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/questions", label: "Câu hỏi" },
  { href: "/admin/import", label: "Nhập file" },
  { href: "/admin/exams", label: "Đề thi" },
  { href: "/admin/readings", label: "Bài đọc" },
  { href: "/admin/generate", label: "Sinh bằng AI" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6" data-no-translate>
      <AdminNav links={ADMIN_LINKS} />
      {children}
    </div>
  );
}
