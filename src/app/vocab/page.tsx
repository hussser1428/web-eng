import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Từ vựng" };

export default function Page() {
  return <ComingSoon title="Từ vựng" description="Ôn từ đã lưu theo lịch, trắc nghiệm Anh–Việt và Việt–Anh." />;
}
