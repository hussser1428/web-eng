import { describe, it, expect } from "vitest";
import { TOEIC } from "./toeic";
import { getCertificate, getSection } from "./index";

describe("TOEIC spec", () => {
  it("có 7 phần, tổng 200 câu, id dạng toeic.pN", () => {
    expect(TOEIC.sections).toHaveLength(7);
    expect(TOEIC.sections.map((s) => s.id)).toEqual(["toeic.p1", "toeic.p2", "toeic.p3", "toeic.p4", "toeic.p5", "toeic.p6", "toeic.p7"]);
    expect(TOEIC.sections.reduce((n, s) => n + s.questionCount, 0)).toBe(200);
  });

  it("p1–p4 là listening có audio, p5–p7 là reading không audio", () => {
    expect(TOEIC.sections.filter((s) => s.skill === "listening").every((s) => s.hasAudio)).toBe(true);
    expect(TOEIC.sections.filter((s) => s.skill === "reading").every((s) => !s.hasAudio)).toBe(true);
    expect(getSection(TOEIC, "toeic.p2")?.choiceCount).toBe(3);
    expect(getSection(TOEIC, "toeic.p1")?.hasImage).toBe(true);
  });

  it("thời gian listening 45 phút, reading 75 phút", () => {
    expect(TOEIC.timeLimits).toEqual({ listening: 45, reading: 75 });
  });

  it("0 câu đúng → 5 + 5 = 10; 100/100 → 495 + 495 = 990", () => {
    expect(TOEIC.score({})).toEqual({ parts: { listening: 5, reading: 5 }, total: 10 });
    const full = { "toeic.p1": 6, "toeic.p2": 25, "toeic.p3": 39, "toeic.p4": 30, "toeic.p5": 30, "toeic.p6": 16, "toeic.p7": 54 };
    expect(TOEIC.score(full)).toEqual({ parts: { listening: 495, reading: 495 }, total: 990 });
  });

  it("cộng số câu đúng theo kỹ năng rồi tra bảng; điểm tăng đơn điệu", () => {
    const a = TOEIC.score({ "toeic.p5": 20, "toeic.p6": 10 }); // 30 câu reading
    const b = TOEIC.score({ "toeic.p5": 25, "toeic.p6": 10 }); // 35 câu reading
    expect(a.parts.reading).toBe(130);
    expect(b.parts.reading).toBeGreaterThan(a.parts.reading);
    expect(a.parts.listening).toBe(5);
  });

  it("getCertificate trả TOEIC, mã lạ thì ném UNKNOWN_CERTIFICATE", () => {
    expect(getCertificate("toeic")).toBe(TOEIC);
    expect(() => getCertificate("ielts")).toThrow("UNKNOWN_CERTIFICATE");
  });
});
