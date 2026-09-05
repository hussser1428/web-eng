import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
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
  afterEach(() => vi.useRealTimers());

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

  it("hết giờ thì tự nộp bài", async () => {
    vi.useFakeTimers();
    const start = new Date("2026-09-05T08:00:00Z");
    vi.setSystemTime(start);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ correct: 0, total: 3, scores: { parts: {}, total: 5 }, overtime: false }));
    render(<ExamRunner attempt={{ ...attempt, startedAt: start.toISOString() }} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith("/submit"))).toBe(false);

    await act(async () => { await vi.advanceTimersByTimeAsync(TOEIC.timeLimits.reading * 60_000 + 2_000); });

    const submitCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/submit"));
    expect(submitCall?.[0]).toBe("/api/attempts/a1/submit");
    expect(submitCall?.[1]?.method).toBe("POST");
  });
});

describe("ExamRunner (đề có cả phần nghe và phần đọc)", () => {
  const mixed: AttemptForClient = {
    ...attempt,
    id: "a2",
    questions: [q("l1", "toeic.p1", 1), q("l2", "toeic.p2", 2), q("r1", "toeic.p5", 3)],
  };

  beforeEach(() => { localStorage.clear(); push.mockReset(); vi.restoreAllMocks(); });

  it("bắt đầu ở phần nghe rồi chuyển sang phần đọc, lưu mốc bắt đầu phần đọc", async () => {
    render(<ExamRunner attempt={mixed} sections={TOEIC.sections} timeLimits={TOEIC.timeLimits} />);
    expect(screen.getByText("Phần nghe")).toBeInTheDocument();
    expect(screen.getByText("Câu l1")).toBeInTheDocument();
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.queryByRole("button", { name: "Tới câu 3" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Câu tiếp" }));
    expect(screen.getByText("Câu l2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Chuyển sang phần đọc" }));

    expect(screen.getByText("Phần đọc")).toBeInTheDocument();
    expect(screen.getByText("Câu r1")).toBeInTheDocument();
    expect(screen.queryByText("Câu l1")).toBeNull();
    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("attempt:a2:readingStartedAt")!)).toBeGreaterThan(0);
  });
});
