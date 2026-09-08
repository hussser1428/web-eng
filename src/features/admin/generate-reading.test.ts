import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateReading } from "./generate-reading";

// Nhánh hỏng nào cũng log nguyên lỗi ra server; nuốt đi cho output test sạch.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/** Payload hợp lệ theo `readingFileSchema`: hai đoạn, tổng `2 + n` câu. */
function payload(p: Record<string, unknown> = {}) {
  return {
    title: "Con cáo và chùm nho",
    genre: "HUMOR",
    level: "C1",
    sourceName: "AI (do hệ thống tạo)",
    license: "Nội dung do AI tạo cho mục đích học tập",
    paragraphs: [
      [
        { en: "A fox saw grapes.", vi: "Cáo thấy chùm nho." },
        { en: "He jumped high.", vi: "Nó nhảy lên cao." },
      ],
      [{ en: "The grapes were sour.", vi: "Chùm nho chua lắm." }],
    ],
    ...p,
  };
}

type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: { id: string }; data: Record<string, unknown> };

function fakeDb() {
  const jobCreate = vi.fn<(a: CreateArgs) => Promise<{ id: string }>>(async () => ({ id: "job1" }));
  const jobUpdate = vi.fn<(a: UpdateArgs) => Promise<{ id: string }>>(async () => ({ id: "job1" }));
  const readingCreate = vi.fn<(a: CreateArgs) => Promise<{ id: string }>>(async () => ({ id: "r1" }));
  const sentenceCreateMany = vi.fn(async () => ({ count: 3 }));
  const db = {
    generationJob: { create: jobCreate, update: jobUpdate },
    reading: { create: readingCreate },
    readingSentence: { createMany: sentenceCreateMany },
  };
  return { db: db as never, jobCreate, jobUpdate, readingCreate, sentenceCreateMany };
}

function fakeLlm() {
  const generateJson = vi.fn<(a: { system: string; user: string }) => Promise<unknown>>();
  return { llm: { generateJson } as never, generateJson };
}

const input = { genre: "FAIRY_TALE", level: "A2", length: "short", createdById: "admin1" } as const;
const now = () => new Date("2026-09-08T10:00:00Z");

describe("generateReading", () => {
  it("ghi job type reading với params đầy đủ và resultCount là số câu", async () => {
    const { db, jobCreate, jobUpdate, readingCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValue(payload());

    const r = await generateReading(db, llm, { ...input, topic: "một khu chợ" }, { now });

    expect(jobCreate.mock.calls[0][0].data).toMatchObject({
      type: "reading",
      status: "RUNNING",
      createdById: "admin1",
      params: { genre: "FAIRY_TALE", level: "A2", length: "short", topic: "một khu chợ" },
    });
    expect(r).toEqual({ jobId: "job1", status: "DONE", readingId: "r1", title: "Con cáo và chùm nho" });
    // 3 câu trong hai đoạn
    expect(jobUpdate.mock.calls.at(-1)?.[0]).toEqual({
      where: { id: "job1" },
      data: { status: "DONE", resultCount: 3, finishedAt: now() },
    });
    expect(readingCreate.mock.calls[0][0].data).toMatchObject({ status: "DRAFT", source: "AI" });
  });

  it("không có chủ đề thì params ghi null", async () => {
    const { db, jobCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValue(payload());

    await generateReading(db, llm, input, { now });

    expect(jobCreate.mock.calls[0][0].data.params).toMatchObject({ topic: null });
  });

  it("ép genre/level theo input dù model trả khác", async () => {
    const { db, readingCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValue(payload({ genre: "NEWS", level: "C1" }));

    await generateReading(db, llm, input, { now });

    expect(readingCreate.mock.calls[0][0].data).toMatchObject({ genre: "FAIRY_TALE", level: "A2" });
  });

  it("FAILED khi JSON sai hai lần, không ghi bài", async () => {
    const { db, jobUpdate, readingCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValue({ sai: true });

    const r = await generateReading(db, llm, input, { now });

    expect(generateJson).toHaveBeenCalledTimes(2);
    expect(readingCreate).not.toHaveBeenCalled();
    expect(r).toEqual({ jobId: "job1", status: "FAILED", error: "LLM_BAD_JSON" });
    expect(jobUpdate.mock.calls.at(-1)?.[0]).toEqual({
      where: { id: "job1" },
      data: { status: "FAILED", error: "LLM_BAD_JSON", finishedAt: now() },
    });
  });

  it("không thử lại khi hết hạn mức", async () => {
    const { db, readingCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockRejectedValue(new Error("LLM_RATE_LIMITED"));

    const r = await generateReading(db, llm, input, { now });

    expect(generateJson).toHaveBeenCalledTimes(1);
    expect(readingCreate).not.toHaveBeenCalled();
    expect(r.error).toBe("LLM_RATE_LIMITED");
  });

  it("lỗi lạ của provider quy về LLM_UNAVAILABLE", async () => {
    const { db } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockRejectedValue(new Error("fetch failed"));

    const r = await generateReading(db, llm, input, { now });

    expect(r.error).toBe("LLM_UNAVAILABLE");
  });

  it("gửi prompt đúng độ dài được chọn", async () => {
    const { db } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValue(payload());

    await generateReading(db, llm, { ...input, length: "long" }, { now });

    expect(generateJson.mock.calls[0][0].user).toContain("about 500 words");
  });
});
