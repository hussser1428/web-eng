import type { ContentStatus, PrismaClient, QuestionSource, ReadingGenre, ReadingLevel } from "@prisma/client";

export type ListReadingsAdminDb = Pick<PrismaClient, "reading">;

/** Số bài hiện trên một trang danh sách quản trị. */
export const PAGE_SIZE = 50;

export type ReadingAdminRow = {
  id: string;
  title: string;
  genre: ReadingGenre;
  level: ReadingLevel;
  status: ContentStatus;
  source: QuestionSource;
  wordCount: number;
  sentenceCount: number;
  createdAt: Date;
};

export type ReadingAdminFilter = {
  status?: ContentStatus;
  genre?: ReadingGenre;
  source?: QuestionSource;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type ReadingAdminPage = { items: ReadingAdminRow[]; total: number; page: number; pageSize: number };

type Row = Omit<ReadingAdminRow, "sentenceCount"> & { _count: { sentences: number } };

/** Danh sách bài đọc cho trang quản trị (mọi trạng thái), mới tạo trước. `q` tìm trong tiêu đề. */
export async function listReadingsAdmin(db: ListReadingsAdminDb, f: ReadingAdminFilter): Promise<ReadingAdminPage> {
  const q = f.q?.trim() ?? "";
  const pageSize = f.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, Math.floor(f.page ?? 1));
  const where = {
    ...(f.status ? { status: f.status } : {}),
    ...(f.genre ? { genre: f.genre } : {}),
    ...(f.source ? { source: f.source } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.reading.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        genre: true,
        level: true,
        status: true,
        source: true,
        wordCount: true,
        createdAt: true,
        _count: { select: { sentences: true } },
      },
    }) as unknown as Promise<Row[]>,
    db.reading.count({ where }),
  ]);

  const items = rows.map(({ _count, ...r }) => ({ ...r, sentenceCount: _count.sentences }));
  return { items, total, page, pageSize };
}
