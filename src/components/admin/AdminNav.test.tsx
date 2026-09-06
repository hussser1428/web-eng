import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminNav } from "./AdminNav";

const pathname = vi.fn(() => "/admin");
vi.mock("next/navigation", () => ({ usePathname: () => pathname() }));

const links = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/questions", label: "Câu hỏi" },
  { href: "/admin/import", label: "Nhập file" },
  { href: "/admin/exams", label: "Đề thi" },
  { href: "/admin/generate", label: "Sinh bằng AI" },
];

describe("AdminNav", () => {
  beforeEach(() => pathname.mockReturnValue("/admin"));

  it("đánh dấu đúng link đang mở ở trang gốc", () => {
    render(<AdminNav links={links} />);
    expect(screen.getByRole("link", { name: "Tổng quan" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Câu hỏi" })).not.toHaveAttribute("aria-current");
  });

  it("trang con của một mục thì đánh dấu mục đó, không đánh dấu Tổng quan", () => {
    pathname.mockReturnValue("/admin/questions/abc");
    render(<AdminNav links={links} />);
    expect(screen.getByRole("link", { name: "Câu hỏi" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tổng quan" })).not.toHaveAttribute("aria-current");
  });

  it("render đủ 5 link với đường dẫn đúng", () => {
    render(<AdminNav links={links} />);
    expect(screen.getByRole("link", { name: "Tổng quan" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Câu hỏi" })).toHaveAttribute("href", "/admin/questions");
    expect(screen.getByRole("link", { name: "Nhập file" })).toHaveAttribute("href", "/admin/import");
    expect(screen.getByRole("link", { name: "Đề thi" })).toHaveAttribute("href", "/admin/exams");
    expect(screen.getByRole("link", { name: "Sinh bằng AI" })).toHaveAttribute("href", "/admin/generate");
  });
});
