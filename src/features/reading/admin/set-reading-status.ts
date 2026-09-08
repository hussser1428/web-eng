import { Prisma, type ContentStatus, type PrismaClient } from "@prisma/client";

export type SetReadingStatusDb = Pick<PrismaClient, "reading">;

/** Đăng hoặc gỡ một bài đọc. Bài không có thì ném NOT_FOUND. */
export async function setReadingStatus(
  db: SetReadingStatusDb,
  p: { id: string; status: ContentStatus },
): Promise<void> {
  try {
    await db.reading.update({ where: { id: p.id }, data: { status: p.status } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new Error("NOT_FOUND");
    throw e;
  }
}
