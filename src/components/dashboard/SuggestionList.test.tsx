import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuggestionList } from "./SuggestionList";

describe("SuggestionList", () => {
  it("mỗi gợi ý mở drill đúng phần và đúng kỹ năng, tag có dấu được mã hoá", () => {
    render(
      <SuggestionList
        suggestions={[{ tag: "suy luận", section: "toeic.p7", sectionName: "Part 7 – Đọc hiểu", correct: 1, total: 5, rate: 0.2 }]}
      />,
    );
    const link = screen.getByRole("link", { name: /suy luận/ });
    expect(link).toHaveAttribute("href", `/drill?section=toeic.p7&tag=${encodeURIComponent("suy luận")}`);
    expect(screen.getByText(/đúng 20% trong 5 câu/)).toBeInTheDocument();
  });

  it("chưa có gợi ý thì giải thích cần ít nhất 5 câu mỗi kỹ năng", () => {
    render(<SuggestionList suggestions={[]} />);
    expect(screen.getByText(/ít nhất 5 câu/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
