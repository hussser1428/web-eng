import type { ContentStatus, PrismaClient } from "@prisma/client";

export type SetExamStatusDb = Pick<PrismaClient, "exam">;

/** Đăng hoặc gỡ một đề. Câu trong đề giữ nguyên trạng thái riêng của chúng. */
export async function setExamStatus(db: SetExamStatusDb, p: { id: string; status: ContentStatus }): Promise<void> {
  await db.exam.update({ where: { id: p.id }, data: { status: p.status } });
}
