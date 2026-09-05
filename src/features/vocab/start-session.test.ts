import { describe, it, expect, vi } from "vitest";
import { startVocabSession } from "./start-session";
import type { Distractor } from "./pick-distractors";

const NOW = new Date("2026-09-05T00:00:00.000Z");

type UserWordRow = {
  wordId: string;
  sourceContext: string | null;
  word: {
    headword: string;
    phonetic: string | null;
    pos: string | null;
    meaningVi: string;
    exampleEn: string | null;
    exampleVi: string | null;
  };
};

function userWordRow(wordId: string, headword: string, meaningVi: string): UserWordRow {
  return {
    wordId,
    sourceContext: null,
    word: { headword, phonetic: "/x/", pos: "n", meaningVi, exampleEn: null, exampleVi: null },
  };
}

/** Dãy số giả cho rand, quay vòng để không bao giờ hết. */
function randTu(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("startVocabSession", () => {
  it("chế độ thẻ trả về các từ đến hạn, không đụng tới bảng Word", async () => {
    const db = {
      userWord: { findMany: vi.fn<(args: unknown) => Promise<UserWordRow[]>>(async () => [userWordRow("w1", "apple", "quả táo")]) },
      word: { findMany: vi.fn<(args: unknown) => Promise<Distractor[]>>(async () => []) },
    };

    const s = await startVocabSession(db as never, { userId: "u1", mode: "FLASHCARD", now: NOW });

    expect(s.mode).toBe("FLASHCARD");
    expect(s.early).toBe(false);
    expect(s.items).toHaveLength(1);
    expect(db.word.findMany).not.toHaveBeenCalled();
  });

  it("chế độ trắc nghiệm dựng bốn lựa chọn, đáp án đúng mang id của từ", async () => {
    const db = {
      userWord: { findMany: vi.fn<(args: unknown) => Promise<UserWordRow[]>>(async () => [userWordRow("w1", "apple", "quả táo")]) },
      word: {
        findMany: vi.fn<(args: unknown) => Promise<Distractor[]>>(async () => [
          { id: "w2", headword: "book", meaningVi: "quyển sách" },
          { id: "w3", headword: "car", meaningVi: "xe hơi" },
          { id: "w4", headword: "dog", meaningVi: "con chó" },
        ]),
      },
    };

    const s = await startVocabSession(db as never, { userId: "u1", mode: "QUIZ", now: NOW, rand: randTu([0]) });
    if (s.mode !== "QUIZ") throw new Error("sai chế độ");

    const item = s.items[0];
    expect(item.wordId).toBe("w1");
    expect(item.direction).toBe("EN_TO_VI");
    expect(item.prompt).toBe("apple");
    expect(item.choices).toHaveLength(4);
    expect(item.choices.map((c) => c.text)).toContain("quả táo");
    expect(item.choices.filter((c) => c.id === "w1")).toHaveLength(1);
    // Không được lộ đáp án dưới bất kỳ tên trường nào
    expect(JSON.stringify(item)).not.toContain("answer");
  });

  it("chiều Việt sang Anh hỏi bằng nghĩa và không lộ phiên âm", async () => {
    const db = {
      userWord: { findMany: vi.fn<(args: unknown) => Promise<UserWordRow[]>>(async () => [userWordRow("w1", "apple", "quả táo")]) },
      word: {
        findMany: vi.fn<(args: unknown) => Promise<Distractor[]>>(async () => [
          { id: "w2", headword: "book", meaningVi: "quyển sách" },
          { id: "w3", headword: "car", meaningVi: "xe hơi" },
          { id: "w4", headword: "dog", meaningVi: "con chó" },
        ]),
      },
    };

    const s = await startVocabSession(db as never, { userId: "u1", mode: "QUIZ", now: NOW, rand: randTu([0.9, 0]) });
    if (s.mode !== "QUIZ") throw new Error("sai chế độ");

    expect(s.items[0].direction).toBe("VI_TO_EN");
    expect(s.items[0].prompt).toBe("quả táo");
    expect(s.items[0].phonetic).toBeNull();
    expect(s.items[0].choices.map((c) => c.text)).toContain("apple");
  });

  it("từ không gom đủ nhiễu thì bị bỏ qua, phiên vẫn chạy với từ còn lại", async () => {
    const findManyWord = vi.fn<(args: unknown) => Promise<Distractor[]>>(async () => []);
    findManyWord
      .mockResolvedValueOnce([]) // w1: từ đã lưu — không có
      .mockResolvedValueOnce([]) // w1: từ chung — cũng không có, bỏ qua w1
      .mockResolvedValueOnce([]) // w2: từ đã lưu
      .mockResolvedValueOnce([
        { id: "w3", headword: "car", meaningVi: "xe hơi" },
        { id: "w4", headword: "dog", meaningVi: "con chó" },
        { id: "w5", headword: "egg", meaningVi: "quả trứng" },
      ]);

    const db = {
      userWord: {
        findMany: vi.fn<(args: unknown) => Promise<UserWordRow[]>>(async () => [
          userWordRow("w1", "apple", "quả táo"),
          userWordRow("w2", "book", "quyển sách"),
        ]),
      },
      word: { findMany: findManyWord },
    };

    const s = await startVocabSession(db as never, { userId: "u1", mode: "QUIZ", now: NOW, rand: randTu([0]) });
    if (s.mode !== "QUIZ") throw new Error("sai chế độ");

    expect(s.items).toHaveLength(1);
    expect(s.items[0].wordId).toBe("w2");
  });

  it("có từ để ôn nhưng không dựng được câu nào thì ném NOT_ENOUGH_WORDS", async () => {
    const db = {
      userWord: { findMany: vi.fn<(args: unknown) => Promise<UserWordRow[]>>(async () => [userWordRow("w1", "apple", "quả táo")]) },
      word: { findMany: vi.fn<(args: unknown) => Promise<Distractor[]>>(async () => []) },
    };
    await expect(
      startVocabSession(db as never, { userId: "u1", mode: "QUIZ", now: NOW, rand: randTu([0]) }),
    ).rejects.toThrow("NOT_ENOUGH_WORDS");
  });

  it("chưa lưu từ nào thì phiên rỗng, không ném lỗi", async () => {
    const db = {
      userWord: { findMany: vi.fn<(args: unknown) => Promise<UserWordRow[]>>(async () => []) },
      word: { findMany: vi.fn<(args: unknown) => Promise<Distractor[]>>(async () => []) },
    };
    const s = await startVocabSession(db as never, { userId: "u1", mode: "QUIZ", now: NOW });
    expect(s.items).toEqual([]);
    expect(s.early).toBe(true);
  });
});
