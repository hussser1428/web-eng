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
  // Khoá theo tài khoản khi đã đăng nhập; khách thì theo IP. Không có reverse proxy đặt
  // x-forwarded-for thì mọi khách dùng chung một khoá "local" (xem README, mục "Trước khi công khai").
  const session = await auth();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!limiter.check(session?.user?.id ?? ip)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

  try {
    const result = await translateText({ db: prisma, provider: getTranslateProvider() }, parsed.data.text);
    return NextResponse.json({ ...result, canSave: Boolean(session?.user?.id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "EMPTY" || msg === "TEXT_TOO_LONG") return NextResponse.json({ error: msg }, { status: 400 });
    throw e;
  }
}
