import { describe, it, expect } from "vitest";
import { reviewSm2, addDays, QUALITY, MIN_EASE_FACTOR } from "./sm2";

const MOI = { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };

describe("reviewSm2", () => {
  it("lần đầu trả lời dễ thì hẹn lại sau 1 ngày và easeFactor tăng", () => {
    const r = reviewSm2(MOI, QUALITY.EASY);
    expect(r.repetitions).toBe(1);
    expect(r.intervalDays).toBe(1);
    expect(r.easeFactor).toBeCloseTo(2.6, 5);
  });

  it("lần hai thì hẹn 6 ngày", () => {
    const r = reviewSm2({ easeFactor: 2.6, intervalDays: 1, repetitions: 1 }, QUALITY.EASY);
    expect(r.repetitions).toBe(2);
    expect(r.intervalDays).toBe(6);
  });

  it("từ lần ba trở đi khoảng cách nhân theo easeFactor và làm tròn", () => {
    const r = reviewSm2({ easeFactor: 2.6, intervalDays: 6, repetitions: 2 }, QUALITY.EASY);
    expect(r.easeFactor).toBeCloseTo(2.7, 5);
    expect(r.intervalDays).toBe(16); // round(6 * 2.7) = 16
  });

  it("trắc nghiệm đúng (q=4) giữ nguyên easeFactor", () => {
    const r = reviewSm2({ easeFactor: 2.5, intervalDays: 6, repetitions: 2 }, QUALITY.QUIZ_CORRECT);
    expect(r.easeFactor).toBeCloseTo(2.5, 5);
    expect(r.intervalDays).toBe(15);
  });

  it("quên thì đặt lại về 1 ngày và repetitions 0", () => {
    const r = reviewSm2({ easeFactor: 2.5, intervalDays: 30, repetitions: 5 }, QUALITY.FORGOT);
    expect(r.repetitions).toBe(0);
    expect(r.intervalDays).toBe(1);
    expect(r.easeFactor).toBeLessThan(2.5);
  });

  it("khó (q=3) vẫn tính là nhớ nhưng easeFactor giảm", () => {
    const r = reviewSm2({ easeFactor: 2.5, intervalDays: 6, repetitions: 2 }, QUALITY.HARD);
    expect(r.repetitions).toBe(3);
    expect(r.easeFactor).toBeCloseTo(2.36, 5);
  });

  it("easeFactor không bao giờ xuống dưới 1.3 dù quên nhiều lần", () => {
    let s = { easeFactor: 2.5, intervalDays: 1, repetitions: 0 };
    for (let i = 0; i < 20; i++) s = reviewSm2(s, QUALITY.FORGOT);
    expect(s.easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it("chất lượng ngoài khoảng 0–5 bị kẹp lại, không sinh easeFactor kỳ dị", () => {
    expect(reviewSm2(MOI, 99).easeFactor).toBeCloseTo(2.6, 5);
    expect(reviewSm2(MOI, -5).intervalDays).toBe(1);
  });
});

describe("addDays", () => {
  it("cộng đúng số ngày, không đụng vào mốc gốc", () => {
    const goc = new Date("2026-09-05T10:00:00.000Z");
    expect(addDays(goc, 3).toISOString()).toBe("2026-09-08T10:00:00.000Z");
    expect(goc.toISOString()).toBe("2026-09-05T10:00:00.000Z");
  });
});
