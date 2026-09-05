import { describe, it, expect, vi } from "vitest";
import { pickDrillQuestions, type PickDb } from "./pick-questions";

function fakeDb(ids: string[], history: Array<{ questionId: string; isCorrect: boolean | null }>) {
  const question = { findMany: vi.fn(async () => ids.map((id) => ({ id }))) };
  const attemptAnswer = { findMany: vi.fn(async () => history) };
  return { db: { question, attemptAnswer } as unknown as PickDb, question, attemptAnswer };
}

describe("pickDrillQuestions", () => {
  it("truy vấn câu PUBLISHED đúng certificate/section, lọc skillTags bằng hasSome", async () => {
    const { db, question } = fakeDb(["a", "b"], []);
    await pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", skillTags: ["grammar.tense"], count: 2 });
    expect(question.findMany).toHaveBeenCalledWith({
      where: { certificate: "toeic", section: "toeic.p5", status: "PUBLISHED", skillTags: { hasSome: ["grammar.tense"] } },
      select: { id: true },
    });
  });

  it("không có câu nào → NOT_ENOUGH_QUESTIONS", async () => {
    const { db } = fakeDb([], []);
    await expect(pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", count: 10 })).rejects.toThrow("NOT_ENOUGH_QUESTIONS");
  });

  it("thiếu câu thì trả ít hơn count, không ném", async () => {
    const { db } = fakeDb(["a", "b", "c"], []);
    const r = await pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", count: 10 });
    expect(r.sort()).toEqual(["a", "b", "c"]);
  });

  it("ưu tiên câu chưa làm (3) > làm sai gần nhất (2) > làm đúng (1)", async () => {
    // history sắp theo lần làm mới nhất trước: q "wrong" sai, q "right" đúng, "unseen" không có
    const { db } = fakeDb(["right", "wrong", "unseen"], [
      { questionId: "wrong", isCorrect: false },
      { questionId: "right", isCorrect: true },
      { questionId: "wrong", isCorrect: true }, // lần cũ hơn, phải bị bỏ qua
    ]);
    // tổng trọng số = 1 + 2 + 3 = 6 theo thứ tự ids [right, wrong, unseen]; rand 0.99*6 = 5.94 → unseen
    const r1 = await pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", count: 1, rand: () => 0.99 });
    expect(r1).toEqual(["unseen"]);
    // rand 0.3*6 = 1.8 → wrong (1–3)
    const r2 = await pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", count: 1, rand: () => 0.3 });
    expect(r2).toEqual(["wrong"]);
    // rand 0.1*6 = 0.6 → right (0–1)
    const r3 = await pickDrillQuestions(db, { userId: "u1", certificate: "toeic", section: "toeic.p5", count: 1, rand: () => 0.1 });
    expect(r3).toEqual(["right"]);
  });
});
