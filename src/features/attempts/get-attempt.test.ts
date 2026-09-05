import { describe, it, expect, vi } from "vitest";
import { getAttemptForUser, type GetAttemptDb } from "./get-attempt";

const question = {
  id: "q1", certificate: "toeic", section: "toeic.p5", status: "PUBLISHED", groupId: null, stem: "S", choices: ["a", "b", "c", "d"],
  answer: 0, explanation: "E", skillTags: [], audioUrl: null, imageUrl: null, transcript: null, source: "IMPORT",
  createdAt: new Date(), updatedAt: new Date(), group: null,
};

function fakeDb(attempt: Record<string, unknown> | null) {
  const db = {
    attempt: { findUnique: vi.fn(async () => attempt) },
    attemptAnswer: { findMany: vi.fn(async () => [{ id: "aa1", attemptId: "a1", questionId: "q1", order: 1, chosen: 2, isCorrect: null, question }]) },
  };
  return db as unknown as GetAttemptDb;
}

const started = new Date("2026-09-05T10:00:00Z");

describe("getAttemptForUser", () => {
  it("trả attempt và câu hỏi đã lọc, ngày dạng ISO", async () => {
    const db = fakeDb({ id: "a1", userId: "u1", type: "DRILL", certificate: "toeic", examId: null, startedAt: started, submittedAt: null, config: { section: "toeic.p5" } });
    const r = await getAttemptForUser(db, { attemptId: "a1", userId: "u1" });
    expect(r.startedAt).toBe("2026-09-05T10:00:00.000Z");
    expect(r.submittedAt).toBeNull();
    expect(r.questions).toHaveLength(1);
    expect(r.questions[0]).toMatchObject({ id: "q1", order: 1, chosen: 2 });
    expect(JSON.stringify(r)).not.toContain('"answer"');
  });

  it("không tồn tại → NOT_FOUND; của người khác → FORBIDDEN", async () => {
    await expect(getAttemptForUser(fakeDb(null), { attemptId: "x", userId: "u1" })).rejects.toThrow("NOT_FOUND");
    const other = fakeDb({ id: "a1", userId: "u2", type: "DRILL", certificate: "toeic", examId: null, startedAt: started, submittedAt: null, config: null });
    await expect(getAttemptForUser(other, { attemptId: "a1", userId: "u1" })).rejects.toThrow("FORBIDDEN");
  });
});
