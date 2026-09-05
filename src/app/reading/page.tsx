import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Đọc song ngữ" };

export default function Page() {
  return <ComingSoon emoji="📖" title="Đọc song ngữ" description="Truyện hài, cổ tích, anime, báo với tiếng Anh và tiếng Việt cạnh nhau." />;
}
