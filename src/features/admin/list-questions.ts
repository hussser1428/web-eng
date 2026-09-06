import type { ContentStatus, PrismaClient, QuestionSource } from "@prisma/client";

export type ListQuestionsDb = Pick<PrismaClient, "question">;

/** Số câu hiện trên một trang danh sách quản trị. */
export const PAGE_SIZE = 50;

export type QuestionRow = {
  id: string;
  section: string;
  status: ContentStatus;
  source: QuestionSource;
  stem: string | null;
  answer: number;
  choices: string[];
  hasAudio: boolean;
  groupId: string | null;
  updatedAt: Date;
};

export type QuestionFilter = {
  certificate?: string;
  section?: string;
  status?: ContentStatus;
  source?: QuestionSource;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type QuestionPage = { items: QuestionRow[]; total: number; page: number; pageSize: number };

type Row = {
  id: string;
  section: string;
  status: ContentStatus;
  source: QuestionSource;
  stem: string | null;
  answer: number;
  choices: unknown;
  audioUrl: string | null;
  groupId: string | null;
  updatedAt: Date;
  group: { audioUrl: string | null } | null;
};

/** Danh sách câu hỏi cho trang quản trị, mới sửa gần nhất trước. `q` tìm trong đề bài. */
export async function listQuestions(db: ListQuestionsDb, f: QuestionFilter): Promise<QuestionPage> {
  const q = f.q?.trim() ?? "";
  const pageSize = f.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, Math.floor(f.page ?? 1));
  const where = {
    certificate: f.certificate ?? "toeic",
    ...(f.section ? { section: f.section } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.source ? { source: f.source } : {}),
    ...(q ? { stem: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.question.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { group: { select: { audioUrl: true } } },
    }) as unknown as Promise<Row[]>,
    db.question.count({ where }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    section: r.section,
    status: r.status,
    source: r.source,
    stem: r.stem,
    answer: r.answer,
    choices: r.choices as string[],
    hasAudio: Boolean(r.audioUrl ?? r.group?.audioUrl),
    groupId: r.groupId,
    updatedAt: r.updatedAt,
  }));
  return { items, total, page, pageSize };
}
