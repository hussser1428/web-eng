import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Đọc song ngữ" };

export default function Page() {
  return <ComingSoon icon={BookOpen} title="Đọc song ngữ" description="Truyện hài, cổ tích, anime, báo với tiếng Anh và tiếng Việt cạnh nhau." />;
}
