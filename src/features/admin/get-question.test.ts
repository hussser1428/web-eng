import { describe, it, expect, vi } from "vitest";
import { getQuestion } from "./get-question";

function fakeDb(row: unknown) {
  const findUnique = vi.fn<(args: unknown) => Promise<unknown>>(async () => row);
  return { db: { question: { findUnique } } as never, findUnique };
}

describe("getQuestion", () => {
  it("lấy câu hỏi kèm nhóm để trang sửa có đoạn văn", async () => {
    const row = { id: "q1", section: "toeic.p7", group: { id: "g1", passage: "Bài đọc" } };
    const { db, findUnique } = fakeDb(row);

    await expect(getQuestion(db, "q1")).resolves.toBe(row);
    expect(findUnique.mock.calls[0][0]).toEqual({ where: { id: "q1" }, include: { group: true } });
  });

  it("trả null khi không có câu hỏi", async () => {
    const { db } = fakeDb(null);

    await expect(getQuestion(db, "khong-co")).resolves.toBeNull();
  });
});
