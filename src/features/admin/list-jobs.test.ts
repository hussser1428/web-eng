import { describe, it, expect, vi } from "vitest";
import { listJobs } from "./list-jobs";

function fakeDb() {
  const findMany = vi.fn(async () => []);
  return { db: { generationJob: { findMany } } as never, findMany };
}

describe("listJobs", () => {
  it("không lọc loại job khi không truyền type", async () => {
    const { db, findMany } = fakeDb();

    await listJobs(db);

    expect(findMany).toHaveBeenCalledWith({ where: {}, orderBy: { createdAt: "desc" }, take: 20 });
  });

  it("lọc theo loại job và số dòng được yêu cầu", async () => {
    const { db, findMany } = fakeDb();

    await listJobs(db, { type: "reading", limit: 5 });

    expect(findMany).toHaveBeenCalledWith({
      where: { type: "reading" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  });
});
