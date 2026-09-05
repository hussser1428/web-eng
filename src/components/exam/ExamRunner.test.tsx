import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamRunner } from "./ExamRunner";
import { TOEIC } from "@/features/certificates";
import type { AttemptForClient } from "@/features/attempts/get-attempt";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const q = (id: string, section: string, order: number): AttemptForClient["questions"][number] => ({
  id, section, order, stem: `Câu ${id}`, choices: ["a", "b", "c", "d"], audioUrl: null, imageUrl: null, group: null, chosen: null,
});

const attempt: AttemptForClient = {
  id: "a1", type: "EXAM", certificate: "toeic", examId: "e1", startedAt: new Date().toISOString(), submittedAt: null, config: null,
  questions: [q("q1", "toeic.p5", 1), q("q2", "toeic.p5", 2), q("q3", "toeic.p7", 3)],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("ExamRunner (đề chỉ có phần đọc)", () => {
  beforeEach(() => { localStorage.clear(); push.mockReset(); vi.restoreAllMocks(); });

  it("hiện đồng hồ và câu 1; chọn đáp án lưu vào localStorage; chuyển câu bằng bảng số", async () => {
    render(<ExamRunner attempt={attempt} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(screen.getByText("Câu q1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /C\./ }));
    expect(JSON.parse(localStorage.getItem("attempt:a1:answers")!)).toEqual({ q1: 2 });
    await userEvent.click(screen.getByRole("button", { name: "Tới câu 3" }));
    expect(screen.getByText("Câu q3")).toBeInTheDocument();
  });

  it("đánh dấu xem lại được lưu và hiện trên bảng số", async () => {
    render(<ExamRunner attempt={attempt} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    await userEvent.click(screen.getByRole("button", { name: "Đánh dấu xem lại" }));
    expect(JSON.parse(localStorage.getItem("attempt:a1:flags")!)).toEqual(["q1"]);
    expect(screen.getByRole("button", { name: "Tới câu 1" })).toHaveAttribute("data-flagged", "true");
  });

  it("khôi phục đáp án từ localStorage khi tải lại", () => {
    localStorage.setItem("attempt:a1:answers", JSON.stringify({ q1: 3 }));
    render(<ExamRunner attempt={attempt} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    expect(screen.getByRole("radio", { name: /D\./ })).toHaveAttribute("aria-checked", "true");
  });

  it("nộp bài: xác nhận → POST submit với toàn bộ đáp án → xóa localStorage → chuyển trang kết quả", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ correct: 1, total: 3, scores: { parts: {}, total: 10 }, overtime: false }));
    render(<ExamRunner attempt={attempt} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    await userEvent.click(screen.getByRole("radio", { name: /A\./ }));
    await userEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/attempts/a1/result"));
    const submitCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/submit"))!;
    const body = JSON.parse(String(submitCall[1]?.body));
    expect(body.answers).toEqual([{ questionId: "q1", chosen: 0 }, { questionId: "q2", chosen: null }, { questionId: "q3", chosen: null }]);
    expect(localStorage.getItem("attempt:a1:answers")).toBeNull();
  });

  it("vùng làm bài có data-no-translate", () => {
    const { container } = render(<ExamRunner attempt={attempt} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    expect(container.querySelector("[data-no-translate]")).not.toBeNull();
  });
});
