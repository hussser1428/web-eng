import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeUserWord } from "@/features/vocab/remove-word";

export async function DELETE(_req: Request, { params }: { params: Promise<{ wordId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { wordId } = await params;
  const r = await removeUserWord(prisma, { userId: session.user.id, wordId });
  if (!r.removed) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(r);
}
