import { describe, it, expect, vi } from "vitest";
import { startDrill, type StartDrillDb } from "./start-drill";

vi.mock("@/features/drill/pick-questions", () => ({
  pickDrillQuestions: vi.fn(async () => ["q2", "q1", "q3"]),
}));

function fakeDb() {
  const attempt = { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "a1", ...data })) };
  const attemptAnswer = { createMany: vi.fn(async () => ({ count: 3 })) };
  return { db: { attempt, attemptAnswer, question: {} } as unknown as StartDrillDb, attempt, attemptAnswer };
}

describe("startDrill", () => {
  it("tạo Attempt DRILL với config và các AttemptAnswer theo thứ tự đã chọn", async () => {
    const { db, attempt, attemptAnswer } = fakeDb();
    const r = await startDrill(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", skillTags: ["x"], count: 3 });
    expect(r).toEqual({ attemptId: "a1", count: 3 });
    expect(attempt.create).toHaveBeenCalledWith({
      data: { userId: "u1", certificate: "toeic", type: "DRILL", config: { section: "toeic.p5", skillTags: ["x"], count: 3 } },
    });
    expect(attemptAnswer.createMany).toHaveBeenCalledWith({
      data: [
        { attemptId: "a1", questionId: "q2", order: 1 },
        { attemptId: "a1", questionId: "q1", order: 2 },
        { attemptId: "a1", questionId: "q3", order: 3 },
      ],
    });
  });

  it("section không thuộc chứng chỉ → INVALID", async () => {
    const { db } = fakeDb();
    await expect(startDrill(db, { userId: "u1", certificate: "toeic", section: "toeic.p9", count: 3 })).rejects.toThrow("INVALID");
  });
});
