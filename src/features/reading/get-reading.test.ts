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

  it("trả bài đã đăng với câu gộp theo đoạn, không lộ id câu", async () => {
    const createdAt = new Date("2026-01-01");
    const findFirst = vi.fn(async () => ({
      id: "r1",
      title: "Cô bé quàng khăn đỏ",
      genre: "FAIRY_TALE",
      level: "A2",
      sourceName: "Project Gutenberg",
      sourceUrl: "https://example.com",
      license: "Public domain",
      wordCount: 42,
      status: "PUBLISHED",
      source: "IMPORT",
      createdAt,
      sentences: [
        { id: "s1", readingId: "r1", order: 1, paragraphIndex: 0, en: "a", vi: "a-vi" },
        { id: "s2", readingId: "r1", order: 2, paragraphIndex: 0, en: "b", vi: "b-vi" },
        { id: "s3", readingId: "r1", order: 3, paragraphIndex: 1, en: "c", vi: "c-vi" },
      ],
    }));
    const db = { reading: { findFirst } } as unknown as GetReadingDb;
    const result = await getReading(db, "r1");

    expect(result).toEqual({
      id: "r1",
      title: "Cô bé quàng khăn đỏ",
      genre: "FAIRY_TALE",
      level: "A2",
      sourceName: "Project Gutenberg",
      sourceUrl: "https://example.com",
      license: "Public domain",
      wordCount: 42,
      paragraphs: [
        [
          { order: 1, en: "a", vi: "a-vi" },
          { order: 2, en: "b", vi: "b-vi" },
        ],
        [{ order: 3, en: "c", vi: "c-vi" }],
      ],
    });
  });
});
