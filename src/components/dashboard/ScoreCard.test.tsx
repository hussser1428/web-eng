import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreCard } from "./ScoreCard";

describe("ScoreCard", () => {
  it("chưa thi lần nào → mời thi thử, không hiện điểm", () => {
    render(<ScoreCard latest={null} />);
    expect(screen.getByRole("link", { name: "Thi thử ngay" })).toHaveAttribute("href", "/exam");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("hiện tổng điểm, điểm nghe và đọc, kèm link xem bài làm", () => {
    render(
      <ScoreCard
        latest={{ attemptId: "a1", submittedAt: "2026-09-04T00:00:00.000Z", scores: { parts: { listening: 300, reading: 250 }, total: 550 } }}
      />,
    );
    expect(screen.getByText("550")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem bài làm" })).toHaveAttribute("href", "/attempts/a1/result");
  });
});
