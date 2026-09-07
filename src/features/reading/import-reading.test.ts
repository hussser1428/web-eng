import { describe, it, expect, vi } from "vitest";
import { importReading, type ImportReadingDb } from "./import-reading";
import type { ReadingFile } from "./import-schema";

function fakeDb() {
  const sentences: Array<Record<string, unknown>> = [];
  let n = 0;
  const db = {
    reading: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: `r${++n}`, ...data })),
    },
    readingSentence: {
      createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
        sentences.push(...data);
        return { count: data.length };
      }),
    },
  };
  return { db: db as unknown as ImportReadingDb, raw: db, sentences };
}

const base: ReadingFile = {
  title: "Con cáo và chùm nho",
  genre: "FAIRY_TALE",
  level: "A2",
  sourceName: "Aesop's Fables",
  sourceUrl: "https://www.gutenberg.org/ebooks/11339",
  license: "Public domain",
  paragraphs: [
    [
      { en: "One hot summer day a fox was walking through an orchard.", vi: "Một ngày hè nóng nực, con cáo đi dạo qua vườn cây ăn quả." },
      { en: "He saw a bunch of ripe grapes.", vi: "Nó thấy một chùm nho chín." },
    ],
    [{ en: "The grapes were too high for him to reach.", vi: "Chùm nho quá cao, nó không thể với tới." }],
  ],
};

describe("importReading", () => {
  it("đánh số order liên tục qua các đoạn và paragraphIndex theo đoạn", async () => {
    const { db, sentences } = fakeDb();
    await importReading(db, base, { publish: true });
    expect(sentences.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(sentences.map((s) => s.paragraphIndex)).toEqual([0, 0, 1]);
  });

  it("tính wordCount từ tiếng Anh", async () => {
    const { db, raw } = fakeDb();
    await importReading(db, base, { publish: true });
    // "One hot summer day a fox was walking through an orchard." = 11 từ
    // "He saw a bunch of ripe grapes." = 7 từ
    // "The grapes were too high for him to reach." = 9 từ
    expect(raw.reading.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ wordCount: 27 }) }),
    );
  });

  it("mặc định source IMPORT, status theo publish", async () => {
    const { db, raw } = fakeDb();
    await importReading(db, base, { publish: false });
    expect(raw.reading.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ source: "IMPORT", status: "DRAFT" }) }),
    );
  });

  it("ghi source AI khi được truyền", async () => {
    const { db, raw } = fakeDb();
    await importReading(db, base, { publish: true, source: "AI" });
    expect(raw.reading.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ source: "AI", status: "PUBLISHED" }) }),
    );
  });

  it("trả về readingId và số câu", async () => {
    const { db } = fakeDb();
    const r = await importReading(db, base, { publish: true });
    expect(r).toEqual({ readingId: "r1", sentences: 3 });
  });
});
