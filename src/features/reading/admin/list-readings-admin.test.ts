import { describe, it, expect, vi } from "vitest";
import { listReadingsAdmin } from "./list-readings-admin";

function row(p: Record<string, unknown> = {}) {
  return {
    id: "r1",
    title: "Con cáo và chùm nho",
    genre: "FAIRY_TALE",
    level: "A2",
    status: "DRAFT",
    source: "IMPORT",
    wordCount: 27,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    _count: { sentences: 3 },
    ...p,
  };
}

type FindManyArgs = { where: Record<string, unknown>; skip: number; take: number };

function fakeDb(rows: ReturnType<typeof row>[], total = rows.length) {
  const findMany = vi.fn<(args: FindManyArgs) => Promise<ReturnType<typeof row>[]>>(async () => rows);
  const count = vi.fn<(args: { where: Record<string, unknown> }) => Promise<number>>(async () => total);
  return { db: { reading: { findMany, count } } as never, findMany, count };
}

describe("listReadingsAdmin", () => {
  it("mặc định trang 1, 50 bài, không lọc gì", async () => {
    const { db, findMany, count } = fakeDb([], 0);
    const r = await listReadingsAdmin(db, {});

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({});
    expect(args.skip).toBe(0);
    expect(args.take).toBe(50);
    expect(count.mock.calls[0][0]).toEqual({ where: {} });
    expect(r).toEqual({ items: [], total: 0, page: 1, pageSize: 50 });
  });

  it("lọc theo trạng thái, thể loại, nguồn và tìm trong tiêu đề", async () => {
    const { db, findMany } = fakeDb([]);
    await listReadingsAdmin(db, { status: "PUBLISHED", genre: "NEWS", source: "AI", q: "  cáo  " });

    expect(findMany.mock.calls[0][0].where).toEqual({
      status: "PUBLISHED",
      genre: "NEWS",
      source: "AI",
      title: { contains: "cáo", mode: "insensitive" },
    });
  });

  it("phân trang: trang 3 bỏ qua hai trang đầu", async () => {
    const { db, findMany } = fakeDb([], 120);
    const r = await listReadingsAdmin(db, { page: 3, pageSize: 20 });

    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 40, take: 20 });
    expect(r).toMatchObject({ total: 120, page: 3, pageSize: 20 });
  });

  it("trang nhỏ hơn 1 vẫn về trang 1", async () => {
    const { db, findMany } = fakeDb([]);
    await listReadingsAdmin(db, { page: 0 });
    expect(findMany.mock.calls[0][0].skip).toBe(0);
  });

  it("đổi _count thành sentenceCount", async () => {
    const { db } = fakeDb([row()]);
    const r = await listReadingsAdmin(db, {});
    expect(r.items[0]).toEqual(expect.objectContaining({ id: "r1", sentenceCount: 3, wordCount: 27 }));
    expect(r.items[0]).not.toHaveProperty("_count");
  });
});
