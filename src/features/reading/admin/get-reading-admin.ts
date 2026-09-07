import type { ContentStatus, PrismaClient, QuestionSource } from "@prisma/client";
import { toReadingForClient, type ReadingForClient } from "../get-reading";

export type GetReadingAdminDb = Pick<PrismaClient, "reading">;

export type ReadingAdminDetail = ReadingForClient & { status: ContentStatus; source: QuestionSource };

/** Như `getReading` nhưng lấy cả bài nháp — trang quản trị phải sửa được bài chưa đăng. */
export async function getReadingAdmin(db: GetReadingAdminDb, id: string): Promise<ReadingAdminDetail | null> {
  const reading = await db.reading.findUnique({
    where: { id },
    include: { sentences: { orderBy: { order: "asc" } } },
  });
  if (!reading) return null;
  return { ...toReadingForClient(reading), status: reading.status, source: reading.source };
}
