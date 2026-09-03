import { describe, it, expect } from "vitest";
import { normalizeHeadword, candidateForms } from "./normalize";

describe("normalizeHeadword", () => {
  it("trim, lowercase, bỏ dấu câu hai đầu", () => {
    expect(normalizeHeadword('  "Postpone,"  ')).toBe("postpone");
    expect(normalizeHeadword("don't")).toBe("don't");
  });
});

describe("candidateForms", () => {
  it("giữ từ gốc ở đầu và không trùng", () => {
    expect(candidateForms("book")[0]).toBe("book");
    expect(new Set(candidateForms("book")).size).toBe(candidateForms("book").length);
  });
  it("đuôi s / es / ies", () => {
    expect(candidateForms("books")).toContain("book");
    expect(candidateForms("boxes")).toContain("box");
    expect(candidateForms("cities")).toContain("city");
  });
  it("đuôi ed / d / ied", () => {
    expect(candidateForms("walked")).toContain("walk");
    expect(candidateForms("moved")).toContain("move");
    expect(candidateForms("tried")).toContain("try");
    expect(candidateForms("stopped")).toContain("stop");
  });
  it("đuôi ing", () => {
    expect(candidateForms("walking")).toContain("walk");
    expect(candidateForms("moving")).toContain("move");
    expect(candidateForms("running")).toContain("run");
  });
  it("từ ngắn không bị cắt vô nghĩa", () => {
    expect(candidateForms("is")).toEqual(["is"]);
  });
  it("từ đơn ký tự trả về chính từ đó", () => {
    expect(candidateForms("a")).toEqual(["a"]);
    expect(candidateForms("I")).toEqual(["i"]);
  });
  it("từ chỉ có dấu câu trả về rỗng", () => {
    expect(candidateForms("!!")).toEqual([]);
  });
  it("ưu tiên gốc đúng cho đuôi es", () => {
    const beesForms = candidateForms("bees");
    const beeIndex = beesForms.indexOf("bee");
    const beIndex = beesForms.indexOf("be");
    expect(beeIndex).toBeLessThan(beIndex);

    const boxesForms = candidateForms("boxes");
    const boxIndex = boxesForms.indexOf("box");
    const boxeIndex = boxesForms.indexOf("boxe");
    expect(boxIndex).toBeLessThan(boxeIndex);

    expect(candidateForms("watches")).toContain("watch");
    const watchesIndex = candidateForms("watches").indexOf("watch");
    const watcheIndex = candidateForms("watches").indexOf("watche");
    expect(watchesIndex).toBeLessThan(watcheIndex);
  });
});
