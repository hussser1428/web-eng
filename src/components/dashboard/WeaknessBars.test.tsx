import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeaknessBars } from "./WeaknessBars";

const items = [
  { key: "toeic.p7", label: "Part 7 – Đọc hiểu", correct: 1, total: 4, rate: 0.25 },
  { key: "toeic.p5", label: "Part 5 – Hoàn thành câu", correct: 3, total: 4, rate: 0.75 },
];

describe("WeaknessBars", () => {
  it("hiện nhãn, phần trăm và số câu của từng mục", () => {
    render(<WeaknessBars title="Theo phần thi" items={items} emptyText="Chưa có dữ liệu." />);
    expect(screen.getByRole("heading", { name: "Theo phần thi" })).toBeInTheDocument();
    expect(screen.getByText("Part 7 – Đọc hiểu")).toBeInTheDocument();
    expect(screen.getByText("25% · 1/4 câu")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Part 7 – Đọc hiểu: đúng 25 phần trăm" })).toBeInTheDocument();
  });

  it("danh sách rỗng thì hiện lời nhắc", () => {
    render(<WeaknessBars title="Theo kỹ năng" items={[]} emptyText="Chưa đủ dữ liệu." />);
    expect(screen.getByText("Chưa đủ dữ liệu.")).toBeInTheDocument();
  });

  it("tô màu thanh theo đúng ba dải tỉ lệ, chạm cả hai điểm chuyển 0.5 và 0.75", () => {
    const colorItems = [
      { key: "a", label: "Mốc 0", correct: 0, total: 4, rate: 0 },
      { key: "b", label: "Mốc dưới 0.5", correct: 1, total: 4, rate: 0.25 },
      { key: "c", label: "Mốc 0.5", correct: 2, total: 4, rate: 0.5 },
      { key: "d", label: "Mốc giữa 0.5 và 0.75", correct: 5, total: 8, rate: 0.6 },
      { key: "e", label: "Mốc 0.75", correct: 3, total: 4, rate: 0.75 },
      { key: "f", label: "Mốc 1", correct: 4, total: 4, rate: 1 },
    ];
    render(<WeaknessBars title="Kiểm màu" items={colorItems} emptyText="Chưa có dữ liệu." />);

    const bar = (label: string, pct: number) => screen.getByRole("img", { name: `${label}: đúng ${pct} phần trăm` }).firstElementChild;

    expect(bar("Mốc 0", 0)).toHaveClass("bg-danger");
    expect(bar("Mốc dưới 0.5", 25)).toHaveClass("bg-danger");
    expect(bar("Mốc 0.5", 50)).toHaveClass("bg-accent");
    expect(bar("Mốc giữa 0.5 và 0.75", 60)).toHaveClass("bg-accent");
    expect(bar("Mốc 0.75", 75)).toHaveClass("bg-emerald-400");
    expect(bar("Mốc 1", 100)).toHaveClass("bg-emerald-400");
  });
});
