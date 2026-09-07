import { describe, it, expect, vi } from "vitest";
import { getReading, groupParagraphs, type GetReadingDb } from "./get-reading";

describe("groupParagraphs", () => {
  it("gộp theo paragraphIndex và giữ thứ tự order", () => {
    const rows = [
      { order: 1, paragraphIndex: 0, en: "a", vi: "a-vi" },
      { order: 3, paragraphIndex: 1, en: "c", vi: "c-vi" },
      { order: 2, paragraphIndex: 0, en: "b", vi: "b-vi" },
    ];
    const result = groupParagraphs(rows);
    expect(result).toEqual([
      [
        { order: 1, en: "a", vi: "a-vi" },
        { order: 2, en: "b", vi: "b-vi" },
      ],
      [{ order: 3, en: "c", vi: "c-vi" }],
    ]);
  });

  it("đoạn bị bỏ số vẫn không tạo mảng rỗng", () => {
    const rows = [
      { order: 1, paragraphIndex: 0, en: "a", vi: "a-vi" },
      { order: 2, paragraphIndex: 2, en: "b", vi: "b-vi" },
    ];
    const result = groupParagraphs(rows);
    expect(result).toEqual([[{ order: 1, en: "a", vi: "a-vi" }], [{ order: 2, en: "b", vi: "b-vi" }]]);
  });
});

describe("getReading", () => {
  it("trả null khi bài ở DRAFT", async () => {
    const findFirst = vi.fn(async () => null);
    const db = { reading: { findFirst } } as unknown as GetReadingDb;
    const result = await getReading(db, "r1");
    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1", status: "PUBLISHED" } }),
    );
  });
});
