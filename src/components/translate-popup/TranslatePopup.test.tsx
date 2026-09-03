import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PopupContent } from "./PopupContent";

const word = { id: "w1", headword: "postpone", phonetic: "pəʊst'pəʊn", pos: "ngoại động từ", meaningVi: "hoãn lại", exampleEn: "to postpone a meeting", exampleVi: "hoãn cuộc họp" };

describe("PopupContent", () => {
  it("hiện nghĩa từ điển, phiên âm, ví dụ và nút lưu khi canSave", async () => {
    const onSave = vi.fn();
    render(<PopupContent data={{ kind: "word", word, from: "en", to: "vi", canSave: true }} context="ctx" onSave={onSave} saveState="idle" />);
    expect(screen.getByText("postpone")).toBeInTheDocument();
    expect(screen.getByText(/pəʊst'pəʊn/)).toBeInTheDocument();
    expect(screen.getByText("hoãn lại")).toBeInTheDocument();
    expect(screen.getByText("to postpone a meeting")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Lưu từ" }));
    expect(onSave).toHaveBeenCalledWith("w1", "ctx");
  });

  it("không có nút lưu khi chưa đăng nhập", () => {
    render(<PopupContent data={{ kind: "word", word, from: "en", to: "vi", canSave: false }} context="" onSave={vi.fn()} saveState="idle" />);
    expect(screen.queryByRole("button", { name: "Lưu từ" })).toBeNull();
    expect(screen.getByText(/đăng nhập để lưu/i)).toBeInTheDocument();
  });

  it("hiện bản dịch cụm", () => {
    render(<PopupContent data={{ kind: "text", from: "en", to: "vi", result: "hoãn cuộc họp", canSave: true }} context="" onSave={vi.fn()} saveState="idle" />);
    expect(screen.getByText("hoãn cuộc họp")).toBeInTheDocument();
  });

  it("hiện thông báo khi không dịch được", () => {
    render(<PopupContent data={{ kind: "unavailable", from: "en", to: "vi", canSave: false }} context="" onSave={vi.fn()} saveState="idle" />);
    expect(screen.getByText(/chưa dịch được/i)).toBeInTheDocument();
  });

  it("hiện đã lưu", () => {
    render(<PopupContent data={{ kind: "word", word, from: "en", to: "vi", canSave: true }} context="" onSave={vi.fn()} saveState="saved" />);
    expect(screen.getByText(/đã lưu/i)).toBeInTheDocument();
  });
});
