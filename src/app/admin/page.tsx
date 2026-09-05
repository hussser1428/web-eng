import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Quản trị" };

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");
  return <ComingSoon emoji="🛠️" title="Quản trị" description="Duyệt câu hỏi, đề thi và bài đọc." />;
}
