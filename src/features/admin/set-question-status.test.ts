import { describe, it, expect, vi } from "vitest";
import { setQuestionStatus } from "./set-question-status";

type Row = { id: string; section: string; audioUrl: string | null; group: { audioUrl: string | null } | null };

function fakeDb(rows: Row[]) {
  const findMany = vi.fn(async () => rows);
  const updateMany = vi.fn(async (args: { where: { id: { in: string[] } } }) => ({ count: args.where.id.in.length }));
  return { db: { question: { findMany, updateMany } } as never, findMany, updateMany };
}

describe("setQuestionStatus", () => {
  it("không đăng câu Part 2 thiếu audio", async () => {
    const { db, updateMany } = fakeDb([
      { id: "a", section: "toeic.p2", audioUrl: null, group: null },
      { id: "b", section: "toeic.p2", audioUrl: "/b.mp3", group: null },
    ]);

    const r = await setQuestionStatus(db, { ids: ["a", "b"], status: "PUBLISHED" });

    expect(r).toEqual({ updated: 1, blocked: ["a"] });
    expect(updateMany.mock.calls[0][0]).toEqual({ where: { id: { in: ["b"] } }, data: { status: "PUBLISHED" } });
  });

  it("đăng được câu Part 3 khi nhóm có audio", async () => {
    const { db, updateMany } = fakeDb([{ id: "c", section: "toeic.p3", audioUrl: null, group: { audioUrl: "/g.mp3" } }]);

    const r = await setQuestionStatus(db, { ids: ["c"], status: "PUBLISHED" });

    expect(r).toEqual({ updated: 1, blocked: [] });
    expect(updateMany.mock.calls[0][0]).toEqual({ where: { id: { in: ["c"] } }, data: { status: "PUBLISHED" } });
  });

  it("gỡ thì không kiểm tra audio", async () => {
    const { db, findMany, updateMany } = fakeDb([]);

    const r = await setQuestionStatus(db, { ids: ["a", "b"], status: "DRAFT" });

    expect(r).toEqual({ updated: 2, blocked: [] });
    expect(findMany).not.toHaveBeenCalled();
    expect(updateMany.mock.calls[0][0]).toEqual({ where: { id: { in: ["a", "b"] } }, data: { status: "DRAFT" } });
  });

  it("section không cần audio thì đăng bình thường dù thiếu audio", async () => {
    const { db } = fakeDb([{ id: "d", section: "toeic.p5", audioUrl: null, group: null }]);

    await expect(setQuestionStatus(db, { ids: ["d"], status: "PUBLISHED" })).resolves.toEqual({ updated: 1, blocked: [] });
  });

  it("chặn hết thì không gọi updateMany", async () => {
    const { db, updateMany } = fakeDb([{ id: "e", section: "toeic.p1", audioUrl: null, group: null }]);

    const r = await setQuestionStatus(db, { ids: ["e"], status: "PUBLISHED" });

    expect(r).toEqual({ updated: 0, blocked: ["e"] });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("danh sách rỗng thì không chạm database", async () => {
    const { db, findMany, updateMany } = fakeDb([]);

    const r = await setQuestionStatus(db, { ids: [], status: "PUBLISHED" });

    expect(r).toEqual({ updated: 0, blocked: [] });
    expect(findMany).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });
});
