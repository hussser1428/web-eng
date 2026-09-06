import { describe, it, expect } from "vitest";
import { questionFileSchema } from "@/features/questions/import-schema";
import { buildPrompt } from "./index";
import { MAX_COUNT } from "./limits";
import { SKILL_TAGS } from "./skill-tags";
import * as part5 from "./part5";
import * as part6 from "./part6";
import * as part7 from "./part7";

const parts = [
  { section: "toeic.p5" as const, mod: part5 },
  { section: "toeic.p6" as const, mod: part6 },
  { section: "toeic.p7" as const, mod: part7 },
];

describe("buildPrompt", () => {
  it("ví dụ JSON của cả ba Part parse được bằng questionFileSchema", () => {
    for (const { section, mod } of parts) {
      const parsed = questionFileSchema.safeParse(mod.example);
      expect(parsed.success, `${section}: ${parsed.error?.issues[0]?.message}`).toBe(true);
      if (!parsed.success) continue;

      expect(parsed.data.certificate).toBe("toeic");
      const groupKeys = new Set(parsed.data.groups.map((g) => g.key));
      for (const g of parsed.data.groups) expect(g.section).toBe(section);
      for (const q of parsed.data.questions) {
        expect(q.section).toBe(section);
        expect(q.choices).toHaveLength(4);
        expect(q.skillTags.length).toBeGreaterThan(0);
        for (const t of q.skillTags) expect(SKILL_TAGS).toContain(t);
        if (q.groupKey) expect(groupKeys.has(q.groupKey)).toBe(true);
      }
    }
  });

  it("ví dụ Part 5 có hai câu lẻ, Part 6 một đoạn bốn câu, Part 7 một đoạn nhiều câu", () => {
    const p5 = questionFileSchema.parse(part5.example);
    expect(p5.groups).toHaveLength(0);
    expect(p5.questions).toHaveLength(2);

    const p6 = questionFileSchema.parse(part6.example);
    expect(p6.groups).toHaveLength(1);
    expect(p6.questions).toHaveLength(4);
    for (const n of [1, 2, 3, 4]) expect(p6.groups[0].passage).toContain(`(${n})`);
    expect(p6.questions.every((q) => q.groupKey === p6.groups[0].key)).toBe(true);

    const p7 = questionFileSchema.parse(part7.example);
    expect(p7.groups).toHaveLength(1);
    expect(p7.questions.length).toBeGreaterThanOrEqual(2);
    expect(p7.questions.every((q) => q.groupKey === p7.groups[0].key)).toBe(true);
  });

  it("prompt chứa số câu, skill tag và danh sách tag cho phép", () => {
    for (const { section } of parts) {
      const { system, user } = buildPrompt(section, { count: 6, skillTag: "grammar.tense" });
      expect(user).toContain("6");
      expect(user).toContain("grammar.tense");
      expect(user).toContain("vocab.collocation");
      expect(user).toContain(section);
      expect(system).toContain("Vietnamese");
      expect(system).toContain("JSON");
    }
  });

  it("không có skillTag thì prompt yêu cầu đa dạng tag", () => {
    const { user } = buildPrompt("toeic.p5", { count: 3 });
    expect(user).toContain("Vary");
    expect(user).toContain("3");
  });

  it("Part 6 quy số câu ra số đoạn văn, tối thiểu một đoạn", () => {
    expect(buildPrompt("toeic.p6", { count: 1 }).user).toContain("Write 1 passage ");
    expect(buildPrompt("toeic.p6", { count: 5 }).user).toContain("4 questions in total (requested: 5)");
    expect(buildPrompt("toeic.p6", { count: 6 }).user).toContain("Write 2 passages ");
    expect(buildPrompt("toeic.p6", { count: 6 }).user).toContain("8 questions in total (requested: 6)");
  });

  it("Part 6 không xin quá trần một lô dù yêu cầu 10 câu", () => {
    const { user } = buildPrompt("toeic.p6", { count: MAX_COUNT });
    expect(user).toContain("Write 2 passages ");
    expect(user).toContain("8 questions in total (requested: 10)");
    expect(user).not.toContain("12 questions");
  });

  it("ném UNSUPPORTED_SECTION với phần thi không hỗ trợ", () => {
    expect(() => buildPrompt("toeic.p1" as never, { count: 3 })).toThrow("UNSUPPORTED_SECTION");
  });
});
