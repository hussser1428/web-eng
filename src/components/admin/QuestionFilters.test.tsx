import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionFilters } from "./QuestionFilters";

describe("QuestionFilters", () => {
  it("gửi bằng GET và có đủ ô lọc", () => {
    const { container } = render(<QuestionFilters />);

    expect(container.querySelector("form")).toHaveAttribute("method", "GET");
    expect(screen.getByLabelText("Phần thi")).toBeInTheDocument();
    expect(screen.getByLabelText("Trạng thái")).toBeInTheDocument();
    expect(screen.getByLabelText("Nguồn")).toBeInTheDocument();
    expect(screen.getByLabelText("Tìm trong đề bài")).toBeInTheDocument();
  });

  it("liệt kê đủ 7 phần thi TOEIC kèm lựa chọn tất cả", () => {
    render(<QuestionFilters />);

    const phanThi = screen.getByLabelText("Phần thi") as HTMLSelectElement;
    expect(phanThi.options).toHaveLength(8);
    expect(phanThi.options[1].value).toBe("toeic.p1");
    expect(phanThi.options[1].textContent).toBe("Part 1 – Mô tả tranh");
  });

  it("giữ nguyên giá trị đang lọc", () => {
    render(<QuestionFilters section="toeic.p6" status="PUBLISHED" source="AI" q="report" />);

    expect(screen.getByLabelText("Phần thi")).toHaveValue("toeic.p6");
    expect(screen.getByLabelText("Trạng thái")).toHaveValue("PUBLISHED");
    expect(screen.getByLabelText("Nguồn")).toHaveValue("AI");
    expect(screen.getByLabelText("Tìm trong đề bài")).toHaveValue("report");
  });
});
