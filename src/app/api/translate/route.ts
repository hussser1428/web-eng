import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslateProvider } from "@/lib/providers/translate";
import { translateText } from "@/features/translate/translate";
import { createRateLimiter } from "@/lib/rate-limit";

const bodySchema = z.object({ text: z.string() });

// singleton cấp module: sống suốt vòng đời tiến trình, xem ponytail comment trong rate-limit.ts
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!limiter.check(ip)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

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
