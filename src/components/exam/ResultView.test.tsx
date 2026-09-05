import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultView } from "./ResultView";
import type { AttemptResult } from "@/features/attempts/get-result";

const base: AttemptResult = {
  id: "a1", type: "EXAM", certificate: "toeic", examId: "e1", startedAt: "2026-09-05T08:00:00.000Z", submittedAt: "2026-09-05T09:00:00.000Z",
  overtime: false, scores: { parts: { listening: 5, reading: 130 }, total: 135 }, correct: 1, total: 2,
  bySection: [{ section: "toeic.p5", name: "Part 5 – Hoàn thành câu", correct: 1, total: 2 }],
  questions: [
    { id: "q1", section: "toeic.p5", order: 1, stem: "Đúng rồi", choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null, group: null, chosen: 1, answer: 1, explanation: "E1", isCorrect: true },
    { id: "q2", section: "toeic.p5", order: 2, stem: "Sai rồi", choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null, group: null, chosen: 0, answer: 1, explanation: "E2", isCorrect: false },
  ],
};

describe("ResultView", () => {
  it("thi thử: hiện điểm nghe, đọc, tổng và bảng theo Part", () => {
    render(<ResultView result={base} />);
    expect(screen.getByText("135")).toBeInTheDocument();
    expect(screen.getByText("130")).toBeInTheDocument();
    expect(screen.getByText(/Part 5/)).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("lọc chỉ câu sai", async () => {
    render(<ResultView result={base} />);
    expect(screen.getByText("Đúng rồi")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Chỉ hiện câu sai" }));
    expect(screen.queryByText("Đúng rồi")).toBeNull();
    expect(screen.getByText("Sai rồi")).toBeInTheDocument();
    expect(screen.getByText("E2")).toBeInTheDocument();
  });

  it("drill: không có điểm quy đổi, hiện số câu đúng; overtime hiện cảnh báo", () => {
    render(<ResultView result={{ ...base, type: "DRILL", scores: null, overtime: true }} />);
    expect(screen.queryByText("135")).toBeNull();
    expect(screen.getByText("Nộp quá giờ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Luyện tiếp" })).toHaveAttribute("href", "/drill");
  });
});
