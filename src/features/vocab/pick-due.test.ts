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

type FindManyArgs = {
  where: Record<string, unknown>;
  orderBy: Record<string, unknown>;
  take: number;
  select: unknown;
};

type Row = ReturnType<typeof row>;

describe("pickDueWords", () => {
  it("lấy từ đã đến hạn, sớm nhất trước, tối đa 20 thẻ", async () => {
    const findMany = vi.fn<(args: FindManyArgs) => Promise<Row[]>>(async () => [row("w1", "apple"), row("w2", "book")]);
    const db = { userWord: { findMany } };

    const r = await pickDueWords(db as never, { userId: "u1", now: NOW });

    expect(r.early).toBe(false);
    expect(r.words.map((w) => w.headword)).toEqual(["apple", "book"]);
    expect(r.words[0].wordId).toBe("w1");
    expect(r.words[0].meaningVi).toBe("nghĩa apple");
    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ userId: "u1", dueAt: { lte: NOW } });
    expect(args.orderBy).toEqual({ dueAt: "asc" });
    expect(args.take).toBe(SESSION_SIZE);
  });

  it("không còn từ đến hạn thì trả các từ sắp đến hạn kèm cờ ôn sớm", async () => {
    const findMany = vi.fn<(args: FindManyArgs) => Promise<Row[]>>(async () => []);
    findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([row("w9", "zebra")]);
    const db = { userWord: { findMany } };

    const r = await pickDueWords(db as never, { userId: "u1", now: NOW });

    expect(r.early).toBe(true);
    expect(r.words.map((w) => w.headword)).toEqual(["zebra"]);
    expect(findMany).toHaveBeenCalledTimes(2);
    const args = findMany.mock.calls[1][0];
    expect(args.where).toEqual({ userId: "u1" });
  });

  it("chưa lưu từ nào thì danh sách rỗng", async () => {
    const db = { userWord: { findMany: vi.fn<(args: FindManyArgs) => Promise<Row[]>>(async () => []) } };
    const r = await pickDueWords(db as never, { userId: "u1", now: NOW });
    expect(r.words).toEqual([]);
    expect(r.early).toBe(true);
  });

  it("tôn trọng limit truyền vào", async () => {
    const findMany = vi.fn<(args: FindManyArgs) => Promise<Row[]>>(async () => [row("w1", "apple")]);
    const db = { userWord: { findMany } };
    await pickDueWords(db as never, { userId: "u1", now: NOW, limit: 5 });
    expect(findMany.mock.calls[0][0].take).toBe(5);
  });
});
