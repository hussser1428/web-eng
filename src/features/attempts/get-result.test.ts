import { describe, it, expect, vi } from "vitest";
import { getAttemptResult, type ResultDb } from "./get-result";

const q = (id: string, section: string, answer: number) => ({
  id, certificate: "toeic", section, status: "PUBLISHED", groupId: null, stem: "S", choices: ["a", "b", "c", "d"], answer, explanation: `E${id}`,
  skillTags: [], audioUrl: null, imageUrl: null, transcript: null, source: "IMPORT", createdAt: new Date(), updatedAt: new Date(), group: null,
});

function fakeDb(attempt: Record<string, unknown> | null) {
  const db = {
    attempt: { findUnique: vi.fn(async () => attempt) },
    attemptAnswer: {
      findMany: vi.fn(async () => [
        { id: "r1", attemptId: "a1", questionId: "q1", order: 1, chosen: 1, isCorrect: true, question: q("q1", "toeic.p5", 1) },
        { id: "r2", attemptId: "a1", questionId: "q2", order: 2, chosen: 0, isCorrect: false, question: q("q2", "toeic.p5", 1) },
        { id: "r3", attemptId: "a1", questionId: "q3", order: 3, chosen: null, isCorrect: null, question: q("q3", "toeic.p7", 2) },
      ]),
    },
  };
  return db as unknown as ResultDb;
}

const base = { id: "a1", userId: "u1", type: "EXAM", certificate: "toeic", examId: "e1", startedAt: new Date("2026-09-05T08:00:00Z"), submittedAt: new Date("2026-09-05T09:00:00Z"), overtime: false, scores: { parts: { listening: 5, reading: 5 }, total: 10 }, config: null };

describe("getAttemptResult", () => {
  it("trả điểm, tổng đúng, thống kê theo section có tên, và câu kèm đáp án + giải thích", async () => {
    const r = await getAttemptResult(fakeDb(base), { attemptId: "a1", userId: "u1" });
    expect(r.correct).toBe(1);
    expect(r.total).toBe(3);
    expect(r.scores?.total).toBe(10);
    expect(r.bySection).toEqual([
      { section: "toeic.p5", name: "Part 5 – Hoàn thành câu", correct: 1, total: 2 },
      { section: "toeic.p7", name: "Part 7 – Đọc hiểu", correct: 0, total: 1 },
    ]);
    expect(r.questions[1]).toMatchObject({ id: "q2", chosen: 0, answer: 1, explanation: "Eq2", isCorrect: false });
    expect(r.submittedAt).toBe("2026-09-05T09:00:00.000Z");
  });

  it("chưa nộp → NOT_SUBMITTED", async () => {
    await expect(getAttemptResult(fakeDb({ ...base, submittedAt: null }), { attemptId: "a1", userId: "u1" })).rejects.toThrow("NOT_SUBMITTED");
  });
});
