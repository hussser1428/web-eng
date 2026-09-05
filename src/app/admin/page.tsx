import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { auth } from "@/lib/auth";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Quản trị" };

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");
  return <ComingSoon icon={Wrench} title="Quản trị" description="Duyệt câu hỏi, đề thi và bài đọc." />;
}
