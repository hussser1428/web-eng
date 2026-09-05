import { describe, it, expect, vi } from "vitest";
import { listUserWords, PAGE_SIZE } from "./list-words";

type FindManyArgs = { where: Record<string, unknown>; orderBy: unknown; skip: number; take: number };
type CountArgs = { where: Record<string, unknown> };

function fakeDb(rows: unknown[], total: number) {
  return {
    userWord: {
      findMany: vi.fn<(args: FindManyArgs) => Promise<unknown[]>>(async () => rows),
      count: vi.fn<(args: CountArgs) => Promise<number>>(async () => total),
    },
  };
}

const ROW = {
  wordId: "w1",
  sourceContext: "I ate an apple.",
  dueAt: new Date("2026-09-06T00:00:00.000Z"),
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  word: { headword: "apple", phonetic: "/ˈæp.əl/", pos: "n", meaningVi: "quả táo" },
};

describe("listUserWords", () => {
  it("trả về từ đã lưu kèm tổng số, mới lưu lên trước", async () => {
    const db = fakeDb([ROW], 1);
    const r = await listUserWords(db as never, { userId: "u1" });

    expect(r.total).toBe(1);
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(PAGE_SIZE);
    expect(r.items[0]).toMatchObject({ wordId: "w1", headword: "apple", meaningVi: "quả táo", pos: "n" });
    const args = db.userWord.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "u1" });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.skip).toBe(0);
    expect(args.take).toBe(PAGE_SIZE);
  });

  it("tìm kiếm khớp cả từ lẫn nghĩa, không phân biệt hoa thường", async () => {
    const db = fakeDb([ROW], 1);
    await listUserWords(db as never, { userId: "u1", q: "táo" });

    const args = db.userWord.findMany.mock.calls[0][0] as unknown as { where: { word: { OR: unknown[] } } };
    expect(args.where.word.OR).toEqual([
      { headword: { contains: "táo", mode: "insensitive" } },
      { meaningVi: { contains: "táo", mode: "insensitive" } },
    ]);
    // Đếm phải lọc y hệt, nếu không số trang sẽ sai
    const countArgs = db.userWord.count.mock.calls[0][0];
    expect(countArgs.where).toEqual(args.where);
  });

  it("chuỗi tìm chỉ có khoảng trắng thì coi như không lọc", async () => {
    const db = fakeDb([], 0);
    await listUserWords(db as never, { userId: "u1", q: "   " });
    const args = db.userWord.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "u1" });
  });

  it("trang 2 bỏ qua đúng số dòng của trang 1", async () => {
    const db = fakeDb([], 40);
    const r = await listUserWords(db as never, { userId: "u1", page: 2 });
    expect(db.userWord.findMany.mock.calls[0][0].skip).toBe(PAGE_SIZE);
    expect(r.page).toBe(2);
  });

  it("trang nhỏ hơn 1 bị kẹp về trang 1", async () => {
    const db = fakeDb([], 0);
    const r = await listUserWords(db as never, { userId: "u1", page: 0 });
    expect(r.page).toBe(1);
    expect(db.userWord.findMany.mock.calls[0][0].skip).toBe(0);
  });
});
