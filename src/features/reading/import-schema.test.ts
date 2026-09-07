import { describe, expect, it } from "vitest";
import { readingFileSchema } from "./import-schema";

function baseFile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: "Cô bé quàng khăn đỏ",
    genre: "FAIRY_TALE",
    level: "A2",
    sourceName: "Project Gutenberg",
    license: "Public domain",
    paragraphs: [
      [
        { en: "Once upon a time.", vi: "Ngày xửa ngày xưa." },
        { en: "There was a girl.", vi: "Có một cô bé." },
      ],
      [{ en: "The end.", vi: "Hết." }],
    ],
    ...overrides,
  };
}

describe("readingFileSchema", () => {
  it("nhận file hợp lệ", () => {
    const result = readingFileSchema.safeParse(baseFile());

    expect(result.success).toBe(true);
  });

  it("từ chối đoạn rỗng", () => {
    const result = readingFileSchema.safeParse(baseFile({ paragraphs: [[]] }));

    expect(result.success).toBe(false);
  });

  it("từ chối thể loại lạ", () => {
    const result = readingFileSchema.safeParse(baseFile({ genre: "POEM" }));

    expect(result.success).toBe(false);
  });

  it("từ chối câu thiếu tiếng Việt", () => {
    const result = readingFileSchema.safeParse(
      baseFile({ paragraphs: [[{ en: "Hello." }]] }),
    );

    expect(result.success).toBe(false);
  });

  it("từ chối sourceUrl không phải http", () => {
    const result = readingFileSchema.safeParse(
      baseFile({ sourceUrl: "javascript:alert(1)" }),
    );

    expect(result.success).toBe(false);
  });
});
