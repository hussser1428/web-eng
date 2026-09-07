import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReadingView } from "./ReadingView";
import type { ReadingForClient } from "@/features/reading/get-reading";

const reading: ReadingForClient = {
  id: "r1",
  title: "The Tortoise and the Hare",
  genre: "FAIRY_TALE",
  level: "A2",
  sourceName: "Aesop's Fables",
  sourceUrl: "https://example.com/tortoise-and-hare",
  license: "Public Domain",
  wordCount: 40,
  paragraphs: [
    [
      { order: 1, en: "The tortoise was slow.", vi: "Con rùa đi chậm." },
      { order: 2, en: "The hare was fast.", vi: "Con thỏ chạy nhanh." },
    ],
    [{ order: 3, en: "The tortoise won the race.", vi: "Con rùa thắng cuộc đua." }],
  ],
};

describe("ReadingView", () => {
  it("rê chuột vào câu tiếng Anh thì câu tiếng Việt cùng thứ tự được tô sáng", () => {
    const { container } = render(<ReadingView reading={reading} />);
    const spanAnh2 = container.querySelector('[data-translate-context][data-order="2"]');
    expect(spanAnh2).not.toBeNull();
    fireEvent.mouseEnter(spanAnh2 as Element);
    const highlighted = container.querySelectorAll('[data-highlight="true"]');
    expect(highlighted.length).toBe(2);
    highlighted.forEach((el) => expect(el.getAttribute("data-order")).toBe("2"));
  });

  it("nút ẩn tiếng Việt thêm class hidden cho cột Việt", () => {
    const { container } = render(<ReadingView reading={reading} />);
    const cotViet = container.querySelector('p[lang="vi"]');
    expect(cotViet?.className).not.toContain("hidden");

    const nut = screen.getByRole("button", { name: "Ẩn tiếng Việt" });
    expect(nut).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(nut);

    expect(cotViet?.className).toContain("hidden");
    expect(screen.getByRole("button", { name: "Hiện tiếng Việt" })).toHaveAttribute("aria-pressed", "true");
  });

  it("câu tiếng Anh có data-translate-context để popup lấy đúng câu", () => {
    const { container } = render(<ReadingView reading={reading} />);
    const spans = container.querySelectorAll('p[lang="en"] [data-translate-context]');
    expect(spans.length).toBe(3);
    spans.forEach((s) => expect(s).toHaveAttribute("data-order"));
  });

  it("hiện nguồn và giấy phép", () => {
    render(<ReadingView reading={reading} />);
    expect(screen.getByText(/Aesop's Fables/)).toBeInTheDocument();
    expect(screen.getByText(/Public Domain/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://example.com/tortoise-and-hare");
  });
});
