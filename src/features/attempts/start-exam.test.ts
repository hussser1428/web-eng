import { describe, it, expect, vi } from "vitest";
import { startExam, type StartExamDb } from "./start-exam";

function fakeDb(exam: { id: string; status: string; certificate: string } | null) {
  const db = {
    exam: { findUnique: vi.fn(async () => exam) },
    examQuestion: { findMany: vi.fn(async () => [{ questionId: "q1", order: 1 }, { questionId: "q2", order: 2 }]) },
    attempt: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "a9", ...data })) },
    attemptAnswer: { createMany: vi.fn(async () => ({ count: 2 })) },
  };
  return { db: db as unknown as StartExamDb, raw: db };
}

describe("startExam", () => {
  it("tạo Attempt EXAM với examId và AttemptAnswer theo order của đề", async () => {
    const { db, raw } = fakeDb({ id: "e1", status: "PUBLISHED", certificate: "toeic" });
    const r = await startExam(db, { userId: "u1", examId: "e1" });
    expect(r).toEqual({ attemptId: "a9" });
    expect(raw.attempt.create).toHaveBeenCalledWith({ data: { userId: "u1", certificate: "toeic", type: "EXAM", examId: "e1" } });
    expect(raw.attemptAnswer.createMany).toHaveBeenCalledWith({
      data: [{ attemptId: "a9", questionId: "q1", order: 1 }, { attemptId: "a9", questionId: "q2", order: 2 }],
    });
  });

  it("đề không tồn tại → NOT_FOUND", async () => {
    const { db } = fakeDb(null);
    await expect(startExam(db, { userId: "u1", examId: "x" })).rejects.toThrow("NOT_FOUND");
  });

  it("đề DRAFT → NOT_FOUND", async () => {
    const { db } = fakeDb({ id: "e1", status: "DRAFT", certificate: "toeic" });
    await expect(startExam(db, { userId: "u1", examId: "e1" })).rejects.toThrow("NOT_FOUND");
  });
});
