import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ExamTimer } from "./ExamTimer";

describe("ExamTimer", () => {
  afterEach(() => vi.useRealTimers());

  it("hiện mm:ss, đếm lùi, gọi onExpire một lần khi hết giờ", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T08:00:00Z"));
    const onExpire = vi.fn();
    render(<ExamTimer deadline={Date.now() + 65_000} onExpire={onExpire} />);
    expect(screen.getByRole("timer")).toHaveTextContent("01:05");
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByRole("timer")).toHaveTextContent("00:05");
    act(() => { vi.advanceTimersByTime(6_000); });
    expect(screen.getByRole("timer")).toHaveTextContent("00:00");
    expect(onExpire).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("dưới 5 phút thì đổi màu cảnh báo", () => {
    vi.useFakeTimers();
    render(<ExamTimer deadline={Date.now() + 4 * 60_000} onExpire={() => {}} />);
    expect(screen.getByRole("timer").className).toContain("text-neon-pink");
  });
});
