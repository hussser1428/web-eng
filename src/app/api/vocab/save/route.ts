import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveWord } from "@/features/vocab/save-word";

const bodySchema = z.object({ wordId: z.string().min(1), context: z.string().max(1000).optional() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  try {
    const r = await saveWord(prisma, { userId: session.user.id, wordId: parsed.data.wordId, sourceContext: parsed.data.context });
    return NextResponse.json(r);
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2003") {
      return NextResponse.json({ error: "WORD_NOT_FOUND" }, { status: 404 });
    }
    throw e;
  }
}
