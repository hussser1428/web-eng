import type { PrismaClient } from "@prisma/client";
import { weightedSample } from "./weighted-sample";

export type PickDb = Pick<PrismaClient, "question" | "attemptAnswer">;

export type PickParams = {
  userId: string;
  certificate: string;
  section: string;
  skillTags?: string[];
  count: number;
  rand?: () => number;
};

const WEIGHT_UNSEEN = 3;
const WEIGHT_WRONG = 2;
const WEIGHT_RIGHT = 1;

export async function pickDrillQuestions(db: PickDb, p: PickParams): Promise<string[]> {
  const rows = await db.question.findMany({
    where: {
      certificate: p.certificate,
      section: p.section,
      status: "PUBLISHED",
      ...(p.skillTags && p.skillTags.length > 0 ? { skillTags: { hasSome: p.skillTags } } : {}),
    },
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) throw new Error("NOT_ENOUGH_QUESTIONS");

  // Lần trả lời gần nhất của người dùng cho từng câu (mới nhất trước)
  const history = await db.attemptAnswer.findMany({
    where: { questionId: { in: ids }, chosen: { not: null }, attempt: { userId: p.userId } },
    orderBy: { attempt: { startedAt: "desc" } },
    select: { questionId: true, isCorrect: true },
  });
  const latest = new Map<string, boolean | null>();
  for (const h of history) if (!latest.has(h.questionId)) latest.set(h.questionId, h.isCorrect);

  const weightOf = (id: string) => {
    if (!latest.has(id)) return WEIGHT_UNSEEN;
    return latest.get(id) ? WEIGHT_RIGHT : WEIGHT_WRONG;
  };
  return weightedSample(ids, weightOf, p.count, p.rand);
}
