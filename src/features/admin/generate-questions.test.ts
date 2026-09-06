import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateQuestions } from "./generate-questions";

// Nhánh hỏng nào cũng log nguyên lỗi ra server; nuốt đi cho output test sạch.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/** Payload hợp lệ theo `questionFileSchema`, `n` câu Part 5. */
function payload(n: number, section = "toeic.p5") {
  return {
    certificate: "toeic",
    groups: [],
    questions: Array.from({ length: n }, (_, i) => ({
      section,
      stem: `Câu ${i + 1} ___ .`,
      choices: ["a", "b", "c", "d"],
      answer: i % 4,
      explanation: "Giải thích tiếng Việt.",
      skillTags: ["grammar.tense"],
    })),
  };
}

type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: { id: string }; data: Record<string, unknown> };

function fakeDb() {
  let n = 0;
  const jobCreate = vi.fn<(a: CreateArgs) => Promise<{ id: string }>>(async () => ({ id: "job1" }));
  const jobUpdate = vi.fn<(a: UpdateArgs) => Promise<{ id: string }>>(async () => ({ id: "job1" }));
  const groupCreate = vi.fn<(a: CreateArgs) => Promise<{ id: string }>>(async () => ({ id: `g${++n}` }));
  const questionCreate = vi.fn<(a: CreateArgs) => Promise<{ id: string }>>(async () => ({ id: `q${++n}` }));
  const db = {
    generationJob: { create: jobCreate, update: jobUpdate },
    questionGroup: { create: groupCreate },
    question: { create: questionCreate },
    exam: { create: vi.fn() },
    examQuestion: { createMany: vi.fn() },
  };
  return { db: db as never, jobCreate, jobUpdate, groupCreate, questionCreate };
}

function fakeLlm() {
  const generateJson = vi.fn<(a: { system: string; user: string }) => Promise<unknown>>();
  return { llm: { generateJson } as never, generateJson };
}

const input = { section: "toeic.p5", count: 2, createdById: "admin1" };
const now = () => new Date("2026-09-06T10:00:00Z");

describe("generateQuestions", () => {
  it("thử lại một lần khi JSON sai rồi thành công", async () => {
    const { db, jobUpdate, questionCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValueOnce({ questions: [{ nope: true }] }).mockResolvedValueOnce(payload(2));

    const r = await generateQuestions(db, llm, input, { now });

    expect(generateJson).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ jobId: "job1", status: "DONE", resultCount: 2 });
    expect(questionCreate).toHaveBeenCalledTimes(2);
    // lần hai kèm phản hồi lỗi của lần một
    expect(generateJson.mock.calls[1][0].user).toContain("Previous JSON was invalid");
    expect(generateJson.mock.calls[1][0].user.length).toBeGreaterThan(generateJson.mock.calls[0][0].user.length);
    expect(jobUpdate.mock.calls.at(-1)?.[0]).toEqual({
      where: { id: "job1" },
      data: { status: "DONE", resultCount: 2, finishedAt: now() },
    });
  });

  it("FAILED sau hai lần JSON sai, không ghi câu", async () => {
    const { db, jobUpdate, questionCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValue({ sai: true });

    const r = await generateQuestions(db, llm, input, { now });

    expect(generateJson).toHaveBeenCalledTimes(2);
    expect(questionCreate).not.toHaveBeenCalled();
    expect(r).toEqual({ jobId: "job1", status: "FAILED", resultCount: 0, error: "LLM_BAD_JSON" });
    expect(jobUpdate.mock.calls.at(-1)?.[0]).toEqual({
      where: { id: "job1" },
      data: { status: "FAILED", error: "LLM_BAD_JSON", finishedAt: now() },
    });
  });

  it("thử lại một lần khi provider ném LLM_BAD_JSON", async () => {
    const { db } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockRejectedValueOnce(new Error("LLM_BAD_JSON")).mockResolvedValueOnce(payload(1));

    const r = await generateQuestions(db, llm, input, { now });

    expect(generateJson).toHaveBeenCalledTimes(2);
    expect(r.status).toBe("DONE");
  });

  it("không thử lại khi hết hạn mức", async () => {
    const { db, questionCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockRejectedValue(new Error("LLM_RATE_LIMITED"));

    const r = await generateQuestions(db, llm, input, { now });

    expect(generateJson).toHaveBeenCalledTimes(1);
    expect(questionCreate).not.toHaveBeenCalled();
    expect(r).toEqual({ jobId: "job1", status: "FAILED", resultCount: 0, error: "LLM_RATE_LIMITED" });
  });

  it("không thử lại khi dịch vụ hỏng", async () => {
    const { db } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockRejectedValue(new Error("LLM_UNAVAILABLE"));

    const r = await generateQuestions(db, llm, input, { now });

    expect(generateJson).toHaveBeenCalledTimes(1);
    expect(r.error).toBe("LLM_UNAVAILABLE");
  });

  it("lỗi lạ của provider quy về LLM_UNAVAILABLE", async () => {
    const { db } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockRejectedValue(new Error("fetch failed"));

    const r = await generateQuestions(db, llm, input, { now });

    expect(r.error).toBe("LLM_UNAVAILABLE");
  });

  it("ép section theo input dù model trả section khác", async () => {
    const { db, questionCreate, groupCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValue({
      certificate: "ielts",
      groups: [{ key: "g", section: "toeic.p2", passage: "Đoạn văn (1)." }],
      questions: [
        { section: "toeic.p2", groupKey: "g", stem: "(1)", choices: ["a", "b", "c", "d"], answer: 0, explanation: "Vì vậy.", skillTags: [] },
      ],
    });

    const r = await generateQuestions(db, llm, { ...input, section: "toeic.p6", count: 1 }, { now });

    expect(r.status).toBe("DONE");
    expect(groupCreate.mock.calls[0][0].data).toMatchObject({ certificate: "toeic", section: "toeic.p6" });
    expect(questionCreate.mock.calls[0][0].data).toMatchObject({ certificate: "toeic", section: "toeic.p6" });
  });

  it("kẹp count về 10", async () => {
    const { db, jobCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValue(payload(1));

    await generateQuestions(db, llm, { ...input, count: 25 }, { now });

    expect(jobCreate.mock.calls[0][0].data).toMatchObject({
      type: "questions",
      status: "RUNNING",
      createdById: "admin1",
      params: { certificate: "toeic", section: "toeic.p5", count: 10 },
    });
    expect(generateJson.mock.calls[0][0].user).toContain("10 questions");
  });

  it("ghi source AI và status DRAFT", async () => {
    const { db, questionCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();
    generateJson.mockResolvedValue(payload(1));

    await generateQuestions(db, llm, input, { now });

    expect(questionCreate.mock.calls[0][0].data).toMatchObject({ source: "AI", status: "DRAFT" });
  });

  it("FAILED khi phần thi không sinh được bằng AI", async () => {
    const { db, jobCreate } = fakeDb();
    const { llm, generateJson } = fakeLlm();

    const r = await generateQuestions(db, llm, { ...input, section: "toeic.p1" }, { now });

    expect(jobCreate).toHaveBeenCalledTimes(1);
    expect(generateJson).not.toHaveBeenCalled();
    expect(r).toEqual({ jobId: "job1", status: "FAILED", resultCount: 0, error: "UNSUPPORTED_SECTION" });
  });
});
