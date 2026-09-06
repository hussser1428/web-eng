import type { GenerationJob, PrismaClient } from "@prisma/client";

export type ListJobsDb = Pick<PrismaClient, "generationJob">;

/** Lịch sử sinh câu hỏi, mới nhất trước. */
export function listJobs(db: ListJobsDb, limit = 20): Promise<GenerationJob[]> {
  return db.generationJob.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
