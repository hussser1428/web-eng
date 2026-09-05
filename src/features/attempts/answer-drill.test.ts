import { describe, it, expect, vi } from "vitest";
import { answerDrillQuestion, type AnswerDrillDb } from "./answer-drill";

function fakeDb(attempt: Record<string, unknown> | null, row: Record<string, unknown> | null) {
  const db = {
    attempt: { findUnique: vi.fn(async () => attempt) },
    attemptAnswer: { findUnique: vi.fn(async () => row), update: vi.fn(async () => ({})) },
  };
  return { db: db as unknown as AnswerDrillDb, raw: db };
}
const drill = { id: "a1", userId: "u1", type: "DRILL", submittedAt: null };
const row = { id: "aa1", attemptId: "a1", questionId: "q1", chosen: null, question: { answer: 2, explanation: "Vì X", choices: ["a", "b", "c", "d"] } };

describe("answerDrillQuestion", () => {
  it("ghi chosen + isCorrect và trả đáp án, giải thích", async () => {
    const { db, raw } = fakeDb(drill, row);
    const r = await answerDrillQuestion(db, { attemptId: "a1", userId: "u1", questionId: "q1", chosen: 2 });
    expect(r).toEqual({ isCorrect: true, answer: 2, explanation: "Vì X" });
    expect(raw.attemptAnswer.update).toHaveBeenCalledWith({ where: { id: "aa1" }, data: { chosen: 2, isCorrect: true } });
  });

  it("chọn sai → isCorrect false", async () => {
    const { db } = fakeDb(drill, row);
    const r = await answerDrillQuestion(db, { attemptId: "a1", userId: "u1", questionId: "q1", chosen: 0 });
    expect(r.isCorrect).toBe(false);
  });

  it("chosen ngoài khoảng → INVALID", async () => {
    const { db } = fakeDb(drill, row);
    await expect(answerDrillQuestion(db, { attemptId: "a1", userId: "u1", questionId: "q1", chosen: 4 })).rejects.toThrow("INVALID");
  });

  it("attempt EXAM → WRONG_TYPE; đã nộp → ALREADY_SUBMITTED; câu lạ → NOT_FOUND", async () => {
    await expect(answerDrillQuestion(fakeDb({ ...drill, type: "EXAM" }, row).db, { attemptId: "a1", userId: "u1", questionId: "q1", chosen: 0 })).rejects.toThrow("WRONG_TYPE");
    await expect(answerDrillQuestion(fakeDb({ ...drill, submittedAt: new Date() }, row).db, { attemptId: "a1", userId: "u1", questionId: "q1", chosen: 0 })).rejects.toThrow("ALREADY_SUBMITTED");
    await expect(answerDrillQuestion(fakeDb(drill, null).db, { attemptId: "a1", userId: "u1", questionId: "zz", chosen: 0 })).rejects.toThrow("NOT_FOUND");
  });
});
