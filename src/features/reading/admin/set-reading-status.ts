import type { ContentStatus, PrismaClient } from "@prisma/client";

export type SetReadingStatusDb = Pick<PrismaClient, "reading">;

/** Đăng hoặc gỡ một bài đọc. */
export async function setReadingStatus(
  db: SetReadingStatusDb,
  p: { id: string; status: ContentStatus },
): Promise<void> {
  await db.reading.update({ where: { id: p.id }, data: { status: p.status } });
}
