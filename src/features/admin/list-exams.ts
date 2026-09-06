import type { ContentStatus, PrismaClient } from "@prisma/client";

export type ListExamsDb = Pick<PrismaClient, "exam">;

export type ExamRow = { id: string; title: string; status: ContentStatus; questionCount: number; createdAt: Date };

type Row = { id: string; title: string; status: ContentStatus; createdAt: Date; _count: { questions: number } };

/** Danh sách đề cho trang quản trị, đề mới tạo lên trước. */
export async function listExams(db: ListExamsDb): Promise<ExamRow[]> {
  const rows = (await db.exam.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  })) as unknown as Row[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    questionCount: r._count.questions,
    createdAt: r.createdAt,
  }));
}
