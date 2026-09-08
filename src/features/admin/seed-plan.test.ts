import { describe, it, expect } from "vitest";
import { planBatches, readingSpecs, TARGETS } from "./seed-plan";

describe("planBatches", () => {
  it("P5 thiếu 23 thì ra [10,10,3]", () => {
    expect(planBatches("toeic.p5", TARGETS["toeic.p5"] - 23)).toEqual([10, 10, 3]);
  });

  it("P3 thiếu 10 thì ra [9,3]", () => {
    expect(planBatches("toeic.p3", TARGETS["toeic.p3"] - 10)).toEqual([9, 3]);
  });

  it("P6 thiếu 5 thì ra [8]", () => {
    expect(planBatches("toeic.p6", TARGETS["toeic.p6"] - 5)).toEqual([8]);
  });

  it("đủ thì rỗng", () => {
    expect(planBatches("toeic.p5", TARGETS["toeic.p5"])).toEqual([]);
    expect(planBatches("toeic.p5", TARGETS["toeic.p5"] + 5)).toEqual([]);
  });
});

describe("readingSpecs", () => {
  it("20 bài, mỗi thể loại 5", () => {
    const specs = readingSpecs(20);
    expect(specs).toHaveLength(20);

    const byGenre = new Map<string, number>();
    for (const s of specs) byGenre.set(s.genre, (byGenre.get(s.genre) ?? 0) + 1);
    expect([...byGenre.values()]).toEqual([5, 5, 5, 5]);

    expect(specs[0]).toEqual({ genre: "HUMOR", level: "A2", length: "short" });
    expect(specs[1]).toEqual({ genre: "FAIRY_TALE", level: "A2", length: "medium" });
    expect(specs[4]).toEqual({ genre: "HUMOR", level: "B1", length: "medium" });
  });
});
