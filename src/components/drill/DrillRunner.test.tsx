import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DrillRunner } from "./DrillRunner";
import type { AttemptForClient } from "@/features/attempts/get-attempt";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const attempt: AttemptForClient = {
  id: "a1", type: "DRILL", certificate: "toeic", examId: null, startedAt: "2026-09-05T08:00:00.000Z", submittedAt: null,
  config: { section: "toeic.p5", count: 2 },
  questions: [
    { id: "q1", section: "toeic.p5", order: 1, stem: "Q1", choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null, group: null, chosen: null },
    { id: "q2", section: "toeic.p5", order: 2, stem: "Q2", choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null, group: null, chosen: null },
  ],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("DrillRunner", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("chọn đáp án → gọi API → hiện giải thích → câu tiếp → hết thì nộp và hiện tổng kết", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({ isCorrect: true, answer: 1, explanation: "GT1" }))
      .mockResolvedValueOnce(json({ isCorrect: false, answer: 0, explanation: "GT2" }))
      .mockResolvedValueOnce(json({ correct: 1, total: 2, scores: null, overtime: false }));
    render(<DrillRunner attempt={attempt} />);

    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("Câu 1/2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /B\./ }));
    expect(await screen.findByText("GT1")).toBeInTheDocument();
    expect(screen.getByText("Chính xác!")).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ questionId: "q1", chosen: 1 });

    await userEvent.click(screen.getByRole("button", { name: "Câu tiếp" }));
    expect(screen.getByText("Q2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /D\./ }));
    expect(await screen.findByText("GT2")).toBeInTheDocument();
    expect(screen.getByText("Chưa đúng")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Xem kết quả" }));
    await waitFor(() => expect(screen.getByText("1/2")).toBeInTheDocument());
    expect(fetchMock.mock.calls[2][0]).toBe("/api/attempts/a1/submit");
    expect(screen.getByRole("link", { name: "Luyện tiếp" })).toHaveAttribute("href", "/drill");
    expect(screen.getByRole("link", { name: "Xem chi tiết" })).toHaveAttribute("href", "/attempts/a1/result");
  });

  it("bắt đầu từ câu đầu chưa trả lời khi tải lại trang", () => {
    render(<DrillRunner attempt={{ ...attempt, questions: [{ ...attempt.questions[0], chosen: 2 }, attempt.questions[1]] }} />);
    expect(screen.getByText("Q2")).toBeInTheDocument();
    expect(screen.getByText("Câu 2/2")).toBeInTheDocument();
  });

  it("API lỗi → hiện thông báo và cho thử lại", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ error: "ALREADY_SUBMITTED" }, 409));
    render(<DrillRunner attempt={attempt} />);
    await userEvent.click(screen.getByRole("radio", { name: /A\./ }));
    expect(await screen.findByText(/không gửi được/i)).toBeInTheDocument();
  });
});
