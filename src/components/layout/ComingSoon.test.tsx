import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComingSoon } from "./ComingSoon";

describe("ComingSoon", () => {
  it("hiện tiêu đề, mô tả và link về trang chủ", () => {
    render(<ComingSoon title="Thi thử" description="Làm đề TOEIC đầy đủ." />);
    expect(screen.getByRole("heading", { name: "Thi thử" })).toBeInTheDocument();
    expect(screen.getByText("Làm đề TOEIC đầy đủ.")).toBeInTheDocument();
    expect(screen.getByText(/sắp có/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute("href", "/");
  });
});
