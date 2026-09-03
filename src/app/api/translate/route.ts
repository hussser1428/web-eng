import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslateProvider } from "@/lib/providers/translate";
import { translateText } from "@/features/translate/translate";

const bodySchema = z.object({ text: z.string() });

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

  const session = await auth();
  try {
    const result = await translateText({ db: prisma, provider: getTranslateProvider() }, parsed.data.text);
    return NextResponse.json({ ...result, canSave: Boolean(session?.user?.id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "EMPTY" || msg === "TEXT_TOO_LONG") return NextResponse.json({ error: msg }, { status: 400 });
    throw e;
  }
}
