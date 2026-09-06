import { describe, it, expect, vi } from "vitest";
import { importQuestions, type ImportDb } from "./import-questions";
import { questionFileSchema } from "./import-schema";

function fakeDb() {
  const groups: Array<Record<string, unknown>> = [];
  const questions: Array<Record<string, unknown>> = [];
  const examQuestions: Array<Record<string, unknown>> = [];
  let n = 0;
  const db = {
    questionGroup: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { const g = { id: `g${++n}`, ...data }; groups.push(g); return g; }) },
    question: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { const q = { id: `q${++n}`, ...data }; questions.push(q); return q; }) },
    exam: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "e1", ...data })) },
    examQuestion: { createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => { examQuestions.push(...data); return { count: data.length }; }) },
  };
  return { db: db as unknown as ImportDb, raw: db, groups, questions, examQuestions };
}

const base = {
  certificate: "toeic",
  groups: [{ key: "g1", section: "toeic.p6", passage: "Dear all, ..." }],
  questions: [
    { section: "toeic.p5", stem: "The report ___ by Friday.", choices: ["submit", "submitted", "will be submitted", "submitting"], answer: 2, explanation: "Bị động.", skillTags: ["grammar.passive"] },
    { section: "toeic.p6", groupKey: "g1", stem: "(131)", choices: ["a", "b", "c", "d"], answer: 0, explanation: "x" },
  ],
};

describe("questionFileSchema", () => {
  it("chấp nhận file hợp lệ, mặc định certificate toeic và skillTags rỗng", () => {
    const r = questionFileSchema.safeParse({ questions: [base.questions[1]] });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.certificate).toBe("toeic");
      expect(r.data.questions[0].skillTags).toEqual([]);
    }
  });

  it("từ chối answer vượt số lựa chọn", () => {
    const r = questionFileSchema.safeParse({ questions: [{ ...base.questions[0], answer: 4 }] });
    expect(r.success).toBe(false);
  });
});

describe("importQuestions", () => {
  it("tạo group, gắn groupId cho câu, đặt PUBLISHED khi publish", async () => {
    const { db, groups, questions } = fakeDb();
    const r = await importQuestions(db, questionFileSchema.parse(base), { publish: true });
    expect(r).toEqual({ groups: 1, questions: 2, examId: null });
    expect(groups[0]).toMatchObject({ certificate: "toeic", section: "toeic.p6", passage: "Dear all, ..." });
    expect(questions[1]).toMatchObject({ groupId: "g1", status: "PUBLISHED", source: "IMPORT", skillTags: [] });
    expect(questions[0]).toMatchObject({ status: "PUBLISHED", skillTags: ["grammar.passive"], answer: 2 });
  });

  it("tạo đề với thứ tự câu khi có examTitle", async () => {
    const { db, raw, examQuestions } = fakeDb();
    const r = await importQuestions(db, questionFileSchema.parse(base), { publish: true, examTitle: "Đề mẫu" });
    expect(r.examId).toBe("e1");
    expect(raw.exam.create).toHaveBeenCalledWith({ data: { certificate: "toeic", title: "Đề mẫu", status: "PUBLISHED" } });
    expect(examQuestions.map((x) => x.order)).toEqual([1, 2]);
  });

  it("section không có trong chứng chỉ → INVALID_SECTION", async () => {
    const { db } = fakeDb();
    const bad = questionFileSchema.parse({ questions: [{ ...base.questions[0], section: "toeic.p9" }] });
    await expect(importQuestions(db, bad, { publish: false })).rejects.toThrow("INVALID_SECTION:toeic.p9");
  });

  it("số lựa chọn khác choiceCount của section → INVALID_CHOICES", async () => {
    const { db } = fakeDb();
    const bad = questionFileSchema.parse({ questions: [{ ...base.questions[0], section: "toeic.p2" }] });
    await expect(importQuestions(db, bad, { publish: false })).rejects.toThrow("INVALID_CHOICES:0");
  });

  it("ghi source AI khi được truyền", async () => {
    const { db, questions } = fakeDb();
    await importQuestions(db, questionFileSchema.parse(base), { publish: false, source: "AI" });
    expect(questions.every((q) => q.source === "AI")).toBe(true);
  });

  it("groupKey không khai báo → UNKNOWN_GROUP", async () => {
    const { db } = fakeDb();
    const bad = questionFileSchema.parse({ questions: [{ ...base.questions[1], groupKey: "nope" }] });
    await expect(importQuestions(db, bad, { publish: false })).rejects.toThrow("UNKNOWN_GROUP:nope");
  });
});
