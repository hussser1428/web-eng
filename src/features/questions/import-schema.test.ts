import { describe, it, expect } from "vitest";
import { questionFileSchema } from "./import-schema";

const question = {
  section: "toeic.p6",
  groupKey: "g1",
  stem: "(131)",
  choices: ["a", "b", "c", "d"],
  answer: 0,
  explanation: "x",
};

describe("questionFileSchema — audioUrl/imageUrl", () => {
  it("nhận audioUrl dạng /api/audio/<id>", () => {
    const r = questionFileSchema.safeParse({
      groups: [{ key: "g1", section: "toeic.p6", audioUrl: "/api/audio/abc123" }],
      questions: [question],
    });
    expect(r.success).toBe(true);
  });

  it("từ chối audioUrl javascript:", () => {
    const r = questionFileSchema.safeParse({
      groups: [{ key: "g1", section: "toeic.p6", audioUrl: "javascript:alert(1)" }],
      questions: [question],
    });
    expect(r.success).toBe(false);
  });

  it("từ chối imageUrl javascript:", () => {
    const r = questionFileSchema.safeParse({
      questions: [{ ...question, imageUrl: "javascript:alert(1)" }],
    });
    expect(r.success).toBe(false);
  });
});
