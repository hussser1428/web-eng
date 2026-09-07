import type { PrismaClient, ReadingGenre, ReadingLevel } from "@prisma/client";

export type ListReadingsDb = Pick<PrismaClient, "reading">;

export type ReadingListItem = {
  id: string;
  title: string;
  genre: ReadingGenre;
  level: ReadingLevel;
  wordCount: number;
  createdAt: Date;
};

/** Danh sách bài đọc đã đăng, mới nhất trước; lọc theo thể loại/độ khó khi có truyền vào. */
export async function listReadings(
  db: ListReadingsDb,
  filter: { genre?: ReadingGenre; level?: ReadingLevel } = {},
): Promise<ReadingListItem[]> {
  return db.reading.findMany({
    where: {
      status: "PUBLISHED",
      ...(filter.genre && { genre: filter.genre }),
      ...(filter.level && { level: filter.level }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, title: true, genre: true, level: true, wordCount: true, createdAt: true },
  });
}
