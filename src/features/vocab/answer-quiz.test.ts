import { describe, it, expect, vi } from "vitest";
import { answerQuizWord } from "./answer-quiz";
import { QUALITY } from "./sm2";

const NOW = new Date("2026-09-05T00:00:00.000Z");
const NGAY = 24 * 60 * 60 * 1000;

function fakeDb(word: { headword: string; meaningVi: string } | null) {
  return {
    word: { findUnique: vi.fn(async () => word) },
    userWord: {
      findUnique: vi.fn(async () => ({
        id: "uw1",
        easeFactor: 2.5,
        intervalDays: 6,
        repetitions: 2,
        dueAt: new Date(NOW.getTime() - NGAY),
      })),
      update: vi.fn<(args: unknown) => Promise<object>>(async () => ({})),
    },
  };
}

type UpdateArgs = { data: { intervalDays: number; repetitions: number } };

describe("answerQuizWord", () => {
  it("chọn đúng thì chấm chất lượng 4 và khoảng cách giãn ra", async () => {
    const db = fakeDb({ headword: "apple", meaningVi: "quả táo" });

    const r = await answerQuizWord(db as never, { userId: "u1", wordId: "w1", chosen: "quả táo", direction: "EN_TO_VI", now: NOW });

    expect(r.isCorrect).toBe(true);
    expect(r.correctText).toBe("quả táo");
    const data = (db.userWord.update.mock.calls[0][0] as UpdateArgs).data;
    expect(data.repetitions).toBe(3);
    expect(data.intervalDays).toBe(15); // round(6 * 2.5)
  });

  it("chọn sai thì đặt lại lịch về 1 ngày và repetitions 0", async () => {
    const db = fakeDb({ headword: "apple", meaningVi: "quả táo" });

    const r = await answerQuizWord(db as never, { userId: "u1", wordId: "w1", chosen: "xe hơi", direction: "EN_TO_VI", now: NOW });

    expect(r.isCorrect).toBe(false);
    expect(r.correctText).toBe("quả táo");
    const data = (db.userWord.update.mock.calls[0][0] as UpdateArgs).data;
    expect(data.intervalDays).toBe(1);
    expect(data.repetitions).toBe(0);
    expect(r.dueAt.toISOString()).toBe(new Date(NOW.getTime() + NGAY).toISOString());
  });

  it("chiều Việt sang Anh thì so với headword, đáp án hiện ra là từ tiếng Anh", async () => {
    const db = fakeDb({ headword: "apple", meaningVi: "quả táo" });
    const r = await answerQuizWord(db as never, { userId: "u1", wordId: "w1", chosen: "apple", direction: "VI_TO_EN", now: NOW });
    expect(r.isCorrect).toBe(true);
    expect(r.correctText).toBe("apple");
  });

  it("chiều Việt sang Anh mà gửi nghĩa tiếng Việt thì tính sai — không nhầm chiều", async () => {
    const db = fakeDb({ headword: "apple", meaningVi: "quả táo" });
    const r = await answerQuizWord(db as never, { userId: "u1", wordId: "w1", chosen: "quả táo", direction: "VI_TO_EN", now: NOW });
    expect(r.isCorrect).toBe(false);
  });

  it("chất lượng dùng đúng hằng số của SM-2", () => {
    expect(QUALITY.QUIZ_CORRECT).toBe(4);
    expect(QUALITY.QUIZ_WRONG).toBe(1);
  });

  it("từ không tồn tại thì ném NOT_FOUND và không ghi gì", async () => {
    const db = fakeDb(null);
    await expect(
      answerQuizWord(db as never, { userId: "u1", wordId: "w1", chosen: "quả táo", direction: "EN_TO_VI", now: NOW }),
    ).rejects.toThrow("NOT_FOUND");
    expect(db.userWord.update).not.toHaveBeenCalled();
  });
});
