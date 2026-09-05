import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressSparkline } from "./ProgressSparkline";

const p = (attemptId: string, total: number) => ({ attemptId, submittedAt: "2026-09-04T00:00:00.000Z", total });

describe("ProgressSparkline", () => {
  it("dưới 2 lượt thi thì không vẽ gì", () => {
    const { container } = render(<ProgressSparkline points={[p("a1", 500)]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("vẽ đường và mô tả được bằng lời, nói rõ tăng bao nhiêu điểm", () => {
    render(<ProgressSparkline points={[p("a1", 500), p("a2", 560), p("a3", 620)]} />);
    expect(screen.getByRole("img", { name: /500/ })).toBeInTheDocument();
    expect(screen.getByText(/tăng 120 điểm/)).toBeInTheDocument();
  });

  it("mọi lượt bằng điểm nhau vẫn vẽ được, báo chưa đổi", () => {
    render(<ProgressSparkline points={[p("a1", 500), p("a2", 500)]} />);
    expect(screen.getByText(/chưa đổi/)).toBeInTheDocument();
  });
});
