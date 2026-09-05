import { describe, it, expect, vi } from "vitest";
import { saveExamAnswers, type SaveAnswersDb } from "./save-exam-answers";

function fakeDb(attempt: Record<string, unknown>) {
  const db = {
    attempt: { findUnique: vi.fn(async () => attempt) },
    attemptAnswer: { updateMany: vi.fn(async () => ({ count: 1 })) },
  };
  return { db: db as unknown as SaveAnswersDb, raw: db };
}
const exam = { id: "a1", userId: "u1", type: "EXAM", submittedAt: null };

describe("saveExamAnswers", () => {
  it("cập nhật chosen theo từng câu, đếm số dòng đã lưu", async () => {
    const { db, raw } = fakeDb(exam);
    const r = await saveExamAnswers(db, { attemptId: "a1", userId: "u1", answers: [{ questionId: "q1", chosen: 1 }, { questionId: "q2", chosen: null }] });
    expect(r).toEqual({ saved: 2 });
    expect(raw.attemptAnswer.updateMany).toHaveBeenNthCalledWith(1, { where: { attemptId: "a1", questionId: "q1" }, data: { chosen: 1 } });
    expect(raw.attemptAnswer.updateMany).toHaveBeenNthCalledWith(2, { where: { attemptId: "a1", questionId: "q2" }, data: { chosen: null } });
  });

  it("DRILL → WRONG_TYPE; đã nộp → ALREADY_SUBMITTED", async () => {
    await expect(saveExamAnswers(fakeDb({ ...exam, type: "DRILL" }).db, { attemptId: "a1", userId: "u1", answers: [] })).rejects.toThrow("WRONG_TYPE");
    await expect(saveExamAnswers(fakeDb({ ...exam, submittedAt: new Date() }).db, { attemptId: "a1", userId: "u1", answers: [] })).rejects.toThrow("ALREADY_SUBMITTED");
  });
});
