import { describe, it, expect, vi } from "vitest";
import { updateReading, type UpdateReadingDb } from "./update-reading";
import type { UpdateReadingInput } from "./update-reading-schema";

const input: UpdateReadingInput = {
  title: "Con cáo và chùm nho",
  genre: "FAIRY_TALE",
  level: "A2",
  sourceName: "Aesop",
  license: "Public domain",
  paragraphs: [
    [
      { en: "A fox saw a bunch of grapes.", vi: "Con cáo thấy một chùm nho." },
      { en: "They were high up.", vi: "Chúng ở trên cao." },
    ],
    [{ en: "He walked away.", vi: "Nó bỏ đi." }],
  ],
};

function fakeDb(found: boolean) {
  const raw = {
    reading: {
      findUnique: vi.fn(async () => (found ? { id: "r1" } : null)),
      update: vi.fn(async (a: unknown) => a),
    },
    readingSentence: {
      deleteMany: vi.fn(async (a: unknown) => a),
      createMany: vi.fn(async (a: unknown) => a),
    },
    // Prisma nhận mảng promise-like, nên gọi sẵn các fake ở đây là đúng cách dùng thật.
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
  return { db: raw as unknown as UpdateReadingDb, raw };
}

describe("updateReading", () => {
  it("thay toàn bộ câu trong một transaction và cập nhật wordCount", async () => {
    const { db, raw } = fakeDb(true);
    await updateReading(db, "r1", input);

    expect(raw.$transaction).toHaveBeenCalledTimes(1);
    expect(raw.$transaction.mock.calls[0][0]).toHaveLength(3);
    expect(raw.readingSentence.deleteMany).toHaveBeenCalledWith({ where: { readingId: "r1" } });
    expect(raw.readingSentence.createMany).toHaveBeenCalledWith({
      data: [
        {
          readingId: "r1",
          order: 1,
          paragraphIndex: 0,
          en: "A fox saw a bunch of grapes.",
          vi: "Con cáo thấy một chùm nho.",
        },
        { readingId: "r1", order: 2, paragraphIndex: 0, en: "They were high up.", vi: "Chúng ở trên cao." },
        { readingId: "r1", order: 3, paragraphIndex: 1, en: "He walked away.", vi: "Nó bỏ đi." },
      ],
    });
    // 7 + 4 + 3 từ tiếng Anh
    expect(raw.reading.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: expect.objectContaining({ title: "Con cáo và chùm nho", wordCount: 14, sourceUrl: null }),
    });
  });

  it("NOT_FOUND khi bài không tồn tại", async () => {
    const { db, raw } = fakeDb(false);
    await expect(updateReading(db, "r9", input)).rejects.toThrow("NOT_FOUND");
    expect(raw.$transaction).not.toHaveBeenCalled();
  });
});
