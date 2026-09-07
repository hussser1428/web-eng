import { describe, it, expect, vi } from "vitest";
import { listReadings, type ListReadingsDb } from "./list-readings";

function fakeDb(rows: unknown[] = []) {
  const findMany = vi.fn((args: { where: Record<string, unknown> }) => {
    void args;
    return Promise.resolve(rows);
  });
  const db = { reading: { findMany } };
  return { db: db as unknown as ListReadingsDb, findMany };
}

describe("listReadings", () => {
  it("chỉ lấy bài đã đăng", async () => {
    const { db, findMany } = fakeDb();
    await listReadings(db);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PUBLISHED" } }),
    );
  });

  it("lọc theo thể loại và độ khó khi có", async () => {
    const { db, findMany } = fakeDb();
    await listReadings(db, { genre: "NEWS", level: "B1" });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PUBLISHED", genre: "NEWS", level: "B1" } }),
    );
  });

  it("không đưa genre undefined vào where", async () => {
    const { db, findMany } = fakeDb();
    await listReadings(db, {});
    const call = findMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty("genre");
    expect(call.where).not.toHaveProperty("level");
  });
});
