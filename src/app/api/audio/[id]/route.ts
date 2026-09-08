import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const file = await prisma.audioFile.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      // Bytes do admin nạp vào: cấm trình duyệt tự đoán lại kiểu và chạy nó như HTML.
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(file.bytes.length),
    },
  });
}
