import { describe, it, expect, vi } from "vitest";
import { pickDueWords, SESSION_SIZE } from "./pick-due";

const NOW = new Date("2026-09-05T00:00:00.000Z");

function row(wordId: string, headword: string) {
  return {
    wordId,
    sourceContext: null,
    word: { headword, phonetic: null, pos: "n", meaningVi: `nghĩa ${headword}`, exampleEn: null, exampleVi: null },
  };
}

describe("pickDueWords", () => {
  it("lấy từ đã đến hạn, sớm nhất trước, tối đa 20 thẻ", async () => {
    const findMany = vi.fn(async () => [row("w1", "apple"), row("w2", "book")]);
    const db = { userWord: { findMany } };

    const r = await pickDueWords(db as never, { userId: "u1", now: NOW });

    expect(r.early).toBe(false);
    expect(r.words.map((w) => w.headword)).toEqual(["apple", "book"]);
    expect(r.words[0].wordId).toBe("w1");
    expect(r.words[0].meaningVi).toBe("nghĩa apple");
    expect(findMany).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = (findMany.mock.calls as any[][])[0][0] as { where: unknown; orderBy: unknown; take: number };
    expect(args.where).toMatchObject({ userId: "u1", dueAt: { lte: NOW } });
    expect(args.orderBy).toEqual({ dueAt: "asc" });
    expect(args.take).toBe(SESSION_SIZE);
  });

  it("không còn từ đến hạn thì trả các từ sắp đến hạn kèm cờ ôn sớm", async () => {
    const findMany = vi.fn(async () => []);
    findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([row("w9", "zebra")] as never);
    const db = { userWord: { findMany } };

    const r = await pickDueWords(db as never, { userId: "u1", now: NOW });

    expect(r.early).toBe(true);
    expect(r.words.map((w) => w.headword)).toEqual(["zebra"]);
    expect(findMany).toHaveBeenCalledTimes(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = (findMany.mock.calls as any[][])[1][0] as { where: Record<string, unknown> };
    expect(args.where).toEqual({ userId: "u1" });
  });

  it("chưa lưu từ nào thì danh sách rỗng", async () => {
    const db = { userWord: { findMany: vi.fn(async () => []) } };
    const r = await pickDueWords(db as never, { userId: "u1", now: NOW });
    expect(r.words).toEqual([]);
    expect(r.early).toBe(true);
  });

  it("tôn trọng limit truyền vào", async () => {
    const findMany = vi.fn(async () => [row("w1", "apple")]);
    const db = { userWord: { findMany } };
    await pickDueWords(db as never, { userId: "u1", now: NOW, limit: 5 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(((findMany.mock.calls as any[][])[0][0] as { take: number }).take).toBe(5);
  });
});
