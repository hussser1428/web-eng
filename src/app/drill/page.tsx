import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TOEIC } from "@/features/certificates";
import { DrillSetupForm } from "@/components/drill/DrillSetupForm";

export const metadata: Metadata = { title: "Luyện tập" };

export default async function DrillPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">⚡ Luyện tập theo Part</h1>
        <p className="mt-2 text-muted">Chọn phần và số câu. Sau mỗi câu bạn thấy ngay đáp án và giải thích. Câu chưa làm và câu làm sai được ưu tiên.</p>
      </header>
      <DrillSetupForm sections={TOEIC.sections.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
