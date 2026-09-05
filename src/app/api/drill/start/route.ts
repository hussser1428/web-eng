import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorToResponse } from "@/lib/api-errors";
import { startDrill } from "@/features/attempts/start-drill";

const bodySchema = z.object({
  section: z.string().min(1),
  skillTags: z.array(z.string().min(1)).max(10).optional(),
  count: z.union([z.literal(10), z.literal(20), z.literal(30)]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  try {
    const r = await startDrill(prisma, { userId: session.user.id, certificate: "toeic", ...parsed.data });
    return NextResponse.json(r);
  } catch (e) {
    const r = errorToResponse(e);
    if (r) return r;
    throw e;
  }
}
