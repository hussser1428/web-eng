import { describe, it, expect } from "vitest";
import type { Question, QuestionGroup } from "@prisma/client";
import { toClientQuestion } from "./dto";

const q: Question & { group: QuestionGroup | null } = {
  id: "q1", certificate: "toeic", section: "toeic.p6", status: "PUBLISHED", groupId: "g1",
  stem: "(131)", choices: ["a", "b", "c", "d"], answer: 1, explanation: "bí mật", skillTags: [],
  audioUrl: null, imageUrl: null, transcript: "bí mật 2", source: "IMPORT", createdAt: new Date(), updatedAt: new Date(),
  group: { id: "g1", certificate: "toeic", section: "toeic.p6", passage: "Dear all", transcript: null, audioUrl: null, imageUrl: null },
};

describe("toClientQuestion", () => {
  it("giữ stem, choices, group.passage và chosen; bỏ answer, explanation, transcript", () => {
    const c = toClientQuestion(q, 3, 2);
    expect(c).toEqual({
      id: "q1", section: "toeic.p6", order: 3, stem: "(131)", choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null,
      group: { id: "g1", passage: "Dear all", audioUrl: null, imageUrl: null }, chosen: 2,
    });
    expect(JSON.stringify(c)).not.toContain("bí mật");
  });

  it("group null thì trả null", () => {
    expect(toClientQuestion({ ...q, group: null }, 1, null).group).toBeNull();
  });
});
