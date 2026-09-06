import { describe, it, expect } from "vitest";
import { dueLabel } from "./due-label";

const NOW = new Date("2026-09-05T00:00:00.000Z");
const NGAY = 24 * 60 * 60 * 1000;

describe("dueLabel", () => {
  it("đã quá hạn thì báo đến hạn", () => {
    expect(dueLabel(new Date(NOW.getTime() - 5 * NGAY).toISOString(), NOW)).toBe("Đến hạn");
  });

  it("đúng lúc này cũng là đến hạn", () => {
    expect(dueLabel(NOW.toISOString(), NOW)).toBe("Đến hạn");
  });

  it("còn một ngày thì dùng số ít", () => {
    expect(dueLabel(new Date(NOW.getTime() + NGAY).toISOString(), NOW)).toBe("Còn 1 ngày");
  });

  it("còn nhiều ngày thì đếm số ngày, làm tròn lên", () => {
    expect(dueLabel(new Date(NOW.getTime() + 2.3 * NGAY).toISOString(), NOW)).toBe("Còn 3 ngày");
  });
});
