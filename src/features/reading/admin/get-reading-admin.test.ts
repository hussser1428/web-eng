import { describe, it, expect, vi } from "vitest";
import { getReadingAdmin } from "./get-reading-admin";

const reading = {
  id: "r1",
  title: "Con cáo và chùm nho",
  genre: "FAIRY_TALE",
  level: "A2",
  sourceName: "Aesop",
  sourceUrl: null,
  license: "Public domain",
  wordCount: 10,
  status: "DRAFT",
  source: "AI",
  sentences: [
    { order: 1, paragraphIndex: 0, en: "A fox saw grapes.", vi: "Cáo thấy nho." },
    { order: 2, paragraphIndex: 1, en: "He walked away.", vi: "Nó bỏ đi." },
  ],
};

describe("getReadingAdmin", () => {
  it("lấy cả bài nháp và gộp câu theo đoạn", async () => {
    const findUnique = vi.fn<(args: { where: { id: string } }) => Promise<typeof reading>>(async () => reading);
    const r = await getReadingAdmin({ reading: { findUnique } } as never, "r1");

    expect(findUnique.mock.calls[0][0]).toMatchObject({ where: { id: "r1" } });
    expect(r).toMatchObject({ id: "r1", status: "DRAFT", source: "AI" });
    expect(r?.paragraphs).toEqual([
      [{ order: 1, en: "A fox saw grapes.", vi: "Cáo thấy nho." }],
      [{ order: 2, en: "He walked away.", vi: "Nó bỏ đi." }],
    ]);
  });

  it("null khi không có bài", async () => {
    const findUnique = vi.fn(async () => null);
    expect(await getReadingAdmin({ reading: { findUnique } } as never, "r9")).toBeNull();
  });
});
