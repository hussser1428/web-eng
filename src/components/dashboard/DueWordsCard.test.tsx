import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DueWordsCard } from "./DueWordsCard";

describe("DueWordsCard", () => {
  it("có từ đến hạn thì hiện số và link mở phiên ôn thẻ", () => {
    render(<DueWordsCard due={7} saved={42} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText(/42 từ đã lưu/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ôn ngay/ })).toHaveAttribute("href", "/vocab/flashcard");
  });

  it("đã ôn hết thì không mời ôn tiếp mà dẫn về sổ tay", () => {
    render(<DueWordsCard due={0} saved={42} />);
    expect(screen.getByText(/Hôm nay không còn từ nào đến hạn/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Xem sổ tay/ })).toHaveAttribute("href", "/vocab");
  });

  it("chưa lưu từ nào thì hướng dẫn cách lưu", () => {
    render(<DueWordsCard due={0} saved={0} />);
    expect(screen.getByText(/Bôi đen một từ tiếng Anh/)).toBeInTheDocument();
  });
});
