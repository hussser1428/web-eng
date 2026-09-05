import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { TOEIC } from "@/features/certificates";
import { DrillSetupForm } from "@/components/drill/DrillSetupForm";

export const metadata: Metadata = { title: "Luyện tập" };

export default async function DrillPage({ searchParams }: { searchParams: Promise<{ section?: string; tag?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const sp = await searchParams;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold">
          <Zap size={26} className="text-accent-text" aria-hidden="true" />
          Luyện tập theo Part
        </h1>
        <p className="mt-2 text-muted">Chọn phần và số câu. Sau mỗi câu bạn thấy ngay đáp án và giải thích. Câu chưa làm và câu làm sai được ưu tiên.</p>
      </header>
      <DrillSetupForm
        sections={TOEIC.sections.map((s) => ({ id: s.id, name: s.name }))}
        defaultSection={sp.section}
        defaultTag={sp.tag}
      />
    </div>
  );
}
