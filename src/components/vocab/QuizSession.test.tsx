import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizSession } from "./QuizSession";

const CAU_EN_VI = {
  wordId: "w1",
  direction: "EN_TO_VI" as const,
  prompt: "apple",
  phonetic: "/x/",
  choices: ["quyển sách", "quả táo", "xe hơi", "con chó"],
};

const CAU_VI_EN = {
  wordId: "w5",
  direction: "VI_TO_EN" as const,
  prompt: "con mèo",
  phonetic: null,
  choices: ["cat", "dog", "bird", "fish"],
};

function traLoi(isCorrect: boolean, correctText: string) {
  return new Response(JSON.stringify({ isCorrect, correctText, dueAt: "2026-09-20T00:00:00.000Z" }), { status: 200 });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => traLoi(true, "quả táo")));
});

describe("QuizSession", () => {
  it("hiện câu hỏi với bốn lựa chọn", () => {
    render(<QuizSession items={[CAU_EN_VI]} early={false} />);
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /quả táo|quyển sách|xe hơi|con chó/ })).toHaveLength(4);
  });

  it("chọn đáp án thì gửi đúng chuỗi đã chọn kèm chiều hỏi", async () => {
    const user = userEvent.setup();
    render(<QuizSession items={[CAU_EN_VI]} early={false} />);
    await user.click(screen.getByRole("button", { name: "quả táo" }));

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ wordId: "w1", chosen: "quả táo", direction: "EN_TO_VI" });
  });

  it("chọn sai thì hiện đáp án đúng", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => traLoi(false, "quả táo")));
    const user = userEvent.setup();
    render(<QuizSession items={[CAU_EN_VI]} early={false} />);
    await user.click(screen.getByRole("button", { name: "xe hơi" }));
    expect(await screen.findByText(/Chưa đúng/)).toBeInTheDocument();
  });

  it("đã trả lời thì không bấm lại được", async () => {
    const user = userEvent.setup();
    render(<QuizSession items={[CAU_EN_VI]} early={false} />);
    await user.click(screen.getByRole("button", { name: "quả táo" }));
    expect(await screen.findByRole("button", { name: "quả táo" })).toBeDisabled();
  });

  it("chiều Việt sang Anh ghi rõ đang hỏi từ tiếng Anh", () => {
    render(<QuizSession items={[CAU_VI_EN]} early={false} />);
    expect(screen.getByText(/Chọn từ tiếng Anh/)).toBeInTheDocument();
  });

  it("hết câu thì hiện số đúng trên tổng", async () => {
    const user = userEvent.setup();
    render(<QuizSession items={[CAU_EN_VI]} early={false} />);
    await user.click(screen.getByRole("button", { name: "quả táo" }));
    await user.click(await screen.findByRole("button", { name: "Xem kết quả" }));
    expect(await screen.findByText("1/1")).toBeInTheDocument();
  });

  it("không có câu nào thì mời chuyển sang ôn thẻ", () => {
    render(<QuizSession items={[]} early={false} />);
    expect(screen.getByRole("link", { name: /Ôn thẻ/ })).toHaveAttribute("href", "/vocab/flashcard");
  });
});
