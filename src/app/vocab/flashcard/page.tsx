import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startVocabSession } from "@/features/vocab/start-session";
import { FlashcardSession } from "@/components/vocab/FlashcardSession";

export const metadata: Metadata = { title: "Ôn thẻ" };

export default async function FlashcardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const phien = await startVocabSession(prisma, { userId: session.user.id, mode: "FLASHCARD" });
  if (phien.mode !== "FLASHCARD") throw new Error("WRONG_TYPE");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Ôn thẻ</h1>
      <FlashcardSession items={phien.items} early={phien.early} />
    </div>
  );
}
