import { describe, it, expect } from "vitest";
import { questionFileSchema } from "@/features/questions/import-schema";
import { splitTranscript } from "@/features/admin/tts/segments";
import { buildPrompt } from "./index";
import { MAX_COUNT } from "./limits";
import { SKILL_TAGS } from "./skill-tags";
import * as part2 from "./part2";
import * as part3 from "./part3";
import * as part4 from "./part4";
import * as part5 from "./part5";
import * as part6 from "./part6";
import * as part7 from "./part7";

const parts = [
  { section: "toeic.p2" as const, mod: part2, choices: 3 },
  { section: "toeic.p3" as const, mod: part3, choices: 4 },
  { section: "toeic.p4" as const, mod: part4, choices: 4 },
  { section: "toeic.p5" as const, mod: part5, choices: 4 },
  { section: "toeic.p6" as const, mod: part6, choices: 4 },
  { section: "toeic.p7" as const, mod: part7, choices: 4 },
];

describe("buildPrompt", () => {
  it("ví dụ JSON của mọi Part parse được bằng questionFileSchema", () => {
    for (const { section, mod, choices } of parts) {
      const parsed = questionFileSchema.safeParse(mod.example);
      expect(parsed.success, `${section}: ${parsed.error?.issues[0]?.message}`).toBe(true);
      if (!parsed.success) continue;

      expect(parsed.data.certificate).toBe("toeic");
      const groupKeys = new Set(parsed.data.groups.map((g) => g.key));
      for (const g of parsed.data.groups) expect(g.section).toBe(section);
      for (const q of parsed.data.questions) {
        expect(q.section).toBe(section);
        expect(q.choices).toHaveLength(choices);
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

  it("transcript trong ví dụ Part nghe tách được thành lượt nói", () => {
    const p2 = questionFileSchema.parse(part2.example);
    expect(p2.groups).toHaveLength(0);
    for (const q of p2.questions) {
      const segs = splitTranscript("toeic.p2", q.transcript ?? "");
      expect(segs).toHaveLength(4);
      expect(segs[0].speaker).toBe("M");
      // A/B/C đọc bằng giọng nữ và trùng đúng thứ tự với choices
      expect(segs.slice(1).map((s) => s.speaker)).toEqual(["W", "W", "W"]);
      expect(segs.slice(1).map((s) => s.text)).toEqual(q.choices.map((c, i) => `${"ABC"[i]}. ${c}`));
    }

    const p3 = questionFileSchema.parse(part3.example);
    expect(p3.groups).toHaveLength(1);
    expect(p3.questions).toHaveLength(3);
    const segs3 = splitTranscript("toeic.p3", p3.groups[0].transcript ?? "");
    expect(segs3.length).toBeGreaterThanOrEqual(6);
    expect(new Set(segs3.map((s) => s.speaker))).toEqual(new Set(["M", "W"]));

    const p4 = questionFileSchema.parse(part4.example);
    expect(p4.groups).toHaveLength(1);
    expect(p4.questions).toHaveLength(3);
    const segs4 = splitTranscript("toeic.p4", p4.groups[0].transcript ?? "");
    expect(segs4.length).toBeGreaterThanOrEqual(2);
    expect(segs4.every((s) => s.speaker === "N")).toBe(true);
    const soTu = (p4.groups[0].transcript ?? "").split(/\s+/).filter(Boolean).length;
    expect(soTu).toBeGreaterThanOrEqual(100);
    expect(soTu).toBeLessThanOrEqual(140);
  });

  it("Part 3 và 4 quy số câu ra số nhóm ba câu, tối đa ba nhóm", () => {
    for (const section of ["toeic.p3", "toeic.p4"] as const) {
      expect(buildPrompt(section, { count: 1 }).user).toContain("3 questions in total, requested: 1");
      expect(buildPrompt(section, { count: 5 }).user).toContain("6 questions in total, requested: 5");
      expect(buildPrompt(section, { count: MAX_COUNT }).user).toContain("9 questions in total, requested: 10");
    }
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
