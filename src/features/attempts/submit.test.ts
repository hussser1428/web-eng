import { describe, it, expect, vi } from "vitest";
import { submitAttempt, type SubmitDb } from "./submit";

type Row = { id: string; chosen: number | null; isCorrect: boolean | null; question: { answer: number; section: string } };

function fakeDb(attempt: Record<string, unknown>, rows: Row[]) {
  const db = {
    attempt: { findUnique: vi.fn(async () => attempt), update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...attempt, ...data })) },
    attemptAnswer: { findMany: vi.fn(async () => rows), update: vi.fn(async () => ({})) },
  };
  return { db: db as unknown as SubmitDb, raw: db };
}

const started = new Date("2026-09-05T08:00:00Z");
const rows: Row[] = [
  { id: "r1", chosen: 1, isCorrect: null, question: { answer: 1, section: "toeic.p5" } },
  { id: "r2", chosen: 0, isCorrect: null, question: { answer: 1, section: "toeic.p5" } },
  { id: "r3", chosen: null, isCorrect: null, question: { answer: 2, section: "toeic.p7" } },
  { id: "r4", chosen: 2, isCorrect: null, question: { answer: 2, section: "toeic.p7" } },
];

describe("submitAttempt", () => {
  it("EXAM: chấm từng câu, tính điểm theo CertificateSpec, không overtime khi nộp đúng giờ", async () => {
    const { db, raw } = fakeDb({ id: "a1", userId: "u1", type: "EXAM", certificate: "toeic", startedAt: started, submittedAt: null }, rows);
    const now = new Date("2026-09-05T09:59:00Z"); // 119 phút
    const r = await submitAttempt(db, { attemptId: "a1", userId: "u1", now });
    expect(r.correct).toBe(2);
    expect(r.total).toBe(4);
    expect(r.overtime).toBe(false);
    expect(r.scores).toEqual({ parts: { listening: 5, reading: 5 }, total: 10 }); // 2 câu đúng reading → 5
    expect(raw.attemptAnswer.update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { isCorrect: true } });
    expect(raw.attemptAnswer.update).toHaveBeenCalledWith({ where: { id: "r2" }, data: { isCorrect: false } });
    expect(raw.attemptAnswer.update).toHaveBeenCalledWith({ where: { id: "r3" }, data: { isCorrect: null } });
    expect(raw.attempt.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { submittedAt: now, overtime: false, scores: { parts: { listening: 5, reading: 5 }, total: 10 } },
    });
  });

  it("EXAM: quá 45 + 75 + 2 phút → overtime true nhưng vẫn chấm", async () => {
    const { db } = fakeDb({ id: "a1", userId: "u1", type: "EXAM", certificate: "toeic", startedAt: started, submittedAt: null }, rows);
    const r = await submitAttempt(db, { attemptId: "a1", userId: "u1", now: new Date("2026-09-05T10:03:00Z") }); // 123 phút
    expect(r.overtime).toBe(true);
    expect(r.correct).toBe(2);
  });

  it("DRILL: scores null, overtime false", async () => {
    const { db, raw } = fakeDb({ id: "a1", userId: "u1", type: "DRILL", certificate: "toeic", startedAt: started, submittedAt: null }, rows);
    const now = new Date();
    const r = await submitAttempt(db, { attemptId: "a1", userId: "u1", now });
    expect(r).toEqual({ correct: 2, total: 4, scores: null, overtime: false });
    expect(raw.attempt.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { submittedAt: now, overtime: false, scores: undefined } });
  });

  it("đã nộp → ALREADY_SUBMITTED", async () => {
    const { db } = fakeDb({ id: "a1", userId: "u1", type: "DRILL", certificate: "toeic", startedAt: started, submittedAt: new Date() }, rows);
    await expect(submitAttempt(db, { attemptId: "a1", userId: "u1" })).rejects.toThrow("ALREADY_SUBMITTED");
  });
});
