import { Prisma, type PrismaClient } from "@prisma/client";

export type DeleteReadingDb = Pick<PrismaClient, "reading">;

/** Xoá hẳn một bài đọc; câu trong bài đi theo nhờ `onDelete: Cascade`. Bài không có thì ném NOT_FOUND. */
export async function deleteReading(db: DeleteReadingDb, id: string): Promise<void> {
  try {
    await db.reading.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new Error("NOT_FOUND");
    throw e;
  }
}
