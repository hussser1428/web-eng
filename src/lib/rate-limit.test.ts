import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("cho phép đúng limit lượt, lượt tiếp theo bị chặn", () => {
    const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });
    for (let i = 0; i < 30; i++) expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip1")).toBe(false);
  });

  it("mốc cũ hết hạn (theo now tiêm được) thì cho phép lại", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
    expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip1")).toBe(false);
    t += 1001;
    expect(limiter.check("ip1")).toBe(true);
  });

  it("mỗi key tính riêng", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("ip1")).toBe(true);
    expect(limiter.check("ip2")).toBe(true);
    expect(limiter.check("ip1")).toBe(false);
  });

  it("mảng lọc còn rỗng thì key bị xoá khỏi Map ngay, không tồn đọng mảng rỗng", () => {
    // limit 0 để cô lập đúng nhánh xoá key rỗng: check() luôn từ chối nên không có
    // mốc mới nào được thêm lại — nếu không xoá, Map sẽ giữ một mảng rỗng mãi mãi.
    const limiter = createRateLimiter({ limit: 0, windowMs: 1000 });
    expect(limiter.check("ip1")).toBe(false);
    expect(limiter.size()).toBe(0);
  });
});
