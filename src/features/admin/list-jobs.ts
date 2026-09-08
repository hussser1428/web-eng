import type { GenerationJob, PrismaClient } from "@prisma/client";

export type ListJobsDb = Pick<PrismaClient, "generationJob">;

/** Lịch sử sinh nội dung, mới nhất trước. Không truyền `type` thì lấy mọi loại job. */
export function listJobs(
  db: ListJobsDb,
  opts: { type?: string; limit?: number } = {},
): Promise<GenerationJob[]> {
  return db.generationJob.findMany({
    where: opts.type ? { type: opts.type } : {},
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 20,
  });
}
