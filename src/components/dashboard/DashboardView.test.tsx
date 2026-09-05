import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardView } from "./DashboardView";
import type { Dashboard } from "@/features/stats/load-dashboard";

const empty: Dashboard = {
  certificate: "toeic",
  latest: null,
  history: [],
  bySection: [],
  byTag: [],
  suggestions: [],
  answered: 0,
  vocab: { due: 0, saved: 0 },
};

const full: Dashboard = {
  certificate: "toeic",
  latest: { attemptId: "a2", submittedAt: "2026-09-04T00:00:00.000Z", scores: { parts: { listening: 300, reading: 250 }, total: 550 } },
  history: [
    { attemptId: "a1", submittedAt: "2026-09-01T00:00:00.000Z", total: 500 },
    { attemptId: "a2", submittedAt: "2026-09-04T00:00:00.000Z", total: 550 },
  ],
  bySection: [{ key: "toeic.p7", name: "Part 7 – Đọc hiểu", correct: 1, total: 4, rate: 0.25 }],
  byTag: [{ key: "suy luận", correct: 1, total: 5, rate: 0.2 }],
  suggestions: [{ tag: "suy luận", section: "toeic.p7", sectionName: "Part 7 – Đọc hiểu", correct: 1, total: 5, rate: 0.2 }],
  answered: 9,
  vocab: { due: 0, saved: 0 },
};

describe("DashboardView", () => {
  it("người mới: chào tên, mời làm bài, không có biểu đồ tiến bộ", () => {
    render(<DashboardView name="Thắng" data={empty} />);
    expect(screen.getByRole("heading", { level: 1, name: /Thắng/ })).toBeInTheDocument();
    expect(screen.getByText(/chưa làm câu nào/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tiến bộ" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Thi thử ngay" })).toBeInTheDocument();
  });

  it("có dữ liệu: hiện điểm, tiến bộ, gợi ý và cả hai bảng điểm yếu", () => {
    render(<DashboardView name="Thắng" data={full} />);
    // 550 xuất hiện cả ở thẻ điểm lẫn ở đầu mút đường tiến bộ nên phải dùng getAllByText
    expect(screen.getByRole("heading", { name: "Điểm ước tính" })).toBeInTheDocument();
    expect(screen.getAllByText("550").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Tiến bộ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Theo phần thi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Theo kỹ năng" })).toBeInTheDocument();
    expect(screen.getByText(/đã làm 9 câu/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /suy luận/ })).toHaveAttribute("href", `/drill?section=toeic.p7&tag=${encodeURIComponent("suy luận")}`);
  });
  it("hiện thẻ từ vựng đến hạn", () => {
    render(<DashboardView name="Thắng" data={{ ...empty, vocab: { due: 5, saved: 20 } }} />);
    expect(screen.getByRole("link", { name: /Ôn ngay/ })).toBeInTheDocument();
  });
});
