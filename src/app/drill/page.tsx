import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Luyện tập" };

export default function Page() {
  return <ComingSoon title="Luyện tập" description="Luyện theo từng Part, xem giải thích ngay sau mỗi câu." />;
}
