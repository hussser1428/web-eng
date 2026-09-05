import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Thi thử" };

export default function Page() {
  return <ComingSoon title="Thi thử" description="Làm đề TOEIC Listening & Reading đầy đủ, có đồng hồ và chấm điểm." />;
}
