import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlashcardSession } from "./FlashcardSession";

vi.mock("@/lib/speak", () => ({ speak: vi.fn() }));

function tu(wordId: string, headword: string, meaningVi: string) {
  return {
    wordId,
    headword,
    phonetic: "/x/",
    pos: "n",
    meaningVi,
    exampleEn: "An example.",
    exampleVi: "Một ví dụ.",
    sourceContext: null,
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ dueAt: "2026-09-06T00:00:00.000Z", intervalDays: 1, early: false }), { status: 200 })),
  );
});

describe("FlashcardSession", () => {
  it("mặt trước chỉ hiện từ, chưa lộ nghĩa", () => {
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo")]} early={false} />);
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.queryByText("quả táo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dễ" })).not.toBeInTheDocument();
  });

  it("lật thẻ mới hiện nghĩa và ba nút tự đánh giá", async () => {
    const user = userEvent.setup();
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo")]} early={false} />);
    await user.click(screen.getByRole("button", { name: "Lật thẻ" }));
    expect(screen.getByText("quả táo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quên" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Khó" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dễ" })).toBeInTheDocument();
  });

  it("chấm thẻ thì gửi đúng mức đánh giá rồi sang thẻ kế", async () => {
    const user = userEvent.setup();
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo"), tu("w2", "book", "quyển sách")]} early={false} />);
    await user.click(screen.getByRole("button", { name: "Lật thẻ" }));
    await user.click(screen.getByRole("button", { name: "Khó" }));

    expect(fetch).toHaveBeenCalledWith("/api/vocab/review", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ wordId: "w1", grade: "HARD" });
    expect(await screen.findByText("book")).toBeInTheDocument();
  });

  it("hết thẻ thì hiện tổng kết", async () => {
    const user = userEvent.setup();
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo")]} early={false} />);
    await user.click(screen.getByRole("button", { name: "Lật thẻ" }));
    await user.click(screen.getByRole("button", { name: "Dễ" }));
    expect(await screen.findByText(/Đã ôn 1 thẻ/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sổ tay/i })).toHaveAttribute("href", "/vocab");
  });

  it("ôn sớm thì có dòng chú thích", () => {
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo")]} early />);
    expect(screen.getByText(/ôn sớm/i)).toBeInTheDocument();
  });

  it("không có từ nào thì báo chưa có gì để ôn", () => {
    render(<FlashcardSession items={[]} early />);
    expect(screen.getByText(/chưa có từ nào để ôn/i)).toBeInTheDocument();
  });

  it("gửi thất bại thì báo lỗi và giữ nguyên thẻ", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    const user = userEvent.setup();
    render(<FlashcardSession items={[tu("w1", "apple", "quả táo")]} early={false} />);
    await user.click(screen.getByRole("button", { name: "Lật thẻ" }));
    await user.click(screen.getByRole("button", { name: "Dễ" }));
    expect(await screen.findByText(/Không lưu được/)).toBeInTheDocument();
    expect(screen.getByText("apple")).toBeInTheDocument();
  });
});
