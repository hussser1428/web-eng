import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionCard } from "./QuestionCard";
import type { QuestionForClient } from "@/features/questions/dto";

const q: QuestionForClient = {
  id: "q1", section: "toeic.p6", order: 1, stem: "(131)", choices: ["through", "until", "by", "at"], audioUrl: null, imageUrl: null,
  group: { id: "g1", passage: "Dear all,\nParking closed.", audioUrl: null, imageUrl: null }, chosen: null,
};

describe("QuestionCard", () => {
  it("hiện đoạn văn, stem và 4 lựa chọn có nhãn A–D; chọn thì gọi onSelect", async () => {
    const onSelect = vi.fn();
    render(<QuestionCard q={q} index={1} selected={null} onSelect={onSelect} />);
    expect(screen.getByText(/Parking closed/)).toBeInTheDocument();
    expect(screen.getByText("(131)")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    await userEvent.click(screen.getByRole("radio", { name: /B\.\s*until/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("đánh dấu lựa chọn đang chọn bằng aria-checked", () => {
    render(<QuestionCard q={q} index={1} selected={2} onSelect={() => {}} />);
    expect(screen.getByRole("radio", { name: /C\.\s*by/ })).toHaveAttribute("aria-checked", "true");
  });

  it("khi reveal: hiện giải thích, đáp án đúng có data-state=correct, chọn sai có data-state=wrong, không chọn được nữa", async () => {
    const onSelect = vi.fn();
    render(<QuestionCard q={q} index={1} selected={1} onSelect={onSelect} reveal={{ answer: 0, explanation: "Vì from...through" }} />);
    expect(screen.getByText("Vì from...through")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /A\./ })).toHaveAttribute("data-state", "correct");
    expect(screen.getByRole("radio", { name: /B\./ })).toHaveAttribute("data-state", "wrong");
    await userEvent.click(screen.getByRole("radio", { name: /C\./ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  const p2: QuestionForClient = { ...q, section: "toeic.p2", stem: "", group: null };

  it("Part 2 chỉ hiện chữ cái khi chưa chấm", () => {
    render(<QuestionCard q={p2} index={1} selected={null} onSelect={() => {}} />);
    expect(screen.getByRole("radio", { name: "A" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "B" })).toBeInTheDocument();
    expect(screen.queryByText("through")).not.toBeInTheDocument();
  });

  it("Part 2 hiện nội dung sau khi chấm", () => {
    render(<QuestionCard q={p2} index={1} selected={0} onSelect={() => {}} reveal={{ answer: 1, explanation: "Vì..." }} />);
    expect(screen.getByRole("radio", { name: /A\.\s*through/ })).toBeInTheDocument();
    expect(screen.getByText("through")).toBeInTheDocument();
  });
});
