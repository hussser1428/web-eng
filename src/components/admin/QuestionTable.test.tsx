import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { QuestionTable } from "./QuestionTable";
import { setStatusAction, generateAudioAction } from "@/app/admin/actions";

vi.mock("@/app/admin/actions", () => ({
  setStatusAction: vi.fn(async () => null),
  generateAudioAction: vi.fn(async () => null),
}));

const base = {
  id: "q1",
  section: "toeic.p5",
  status: "DRAFT" as const,
  source: "AI" as const,
  stem: "The report ___ yesterday.",
  answer: 1,
  choices: ["submit", "was submitted", "submitting", "submits"],
  hasAudio: false,
  groupId: null,
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

describe("QuestionTable", () => {
  it("mỗi dòng có checkbox tên ids và link tới trang chi tiết", () => {
    render(<QuestionTable items={[base]} />);

    expect(screen.getByRole("checkbox", { name: /The report/ })).toHaveAttribute("name", "ids");
    expect(screen.getByRole("checkbox", { name: /The report/ })).toHaveAttribute("value", "q1");
    expect(screen.getByRole("link", { name: /The report/ })).toHaveAttribute("href", "/admin/questions/q1");
  });

  it("hai nút Đăng và Gỡ gửi kèm status", () => {
    render(<QuestionTable items={[base]} />);

    expect(screen.getByRole("button", { name: "Đăng" })).toHaveAttribute("value", "PUBLISHED");
    expect(screen.getByRole("button", { name: "Gỡ" })).toHaveAttribute("value", "DRAFT");
    expect(screen.getByRole("button", { name: "Đăng" })).toHaveAttribute("name", "status");
  });

  it("bấm Đăng thì gửi status PUBLISHED kèm câu đã tích", async () => {
    render(<QuestionTable items={[base]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /The report/ }));
    fireEvent.click(screen.getByRole("button", { name: "Đăng" }));

    await waitFor(() => expect(setStatusAction).toHaveBeenCalled());
    const fd = vi.mocked(setStatusAction).mock.calls[0][1];
    expect(fd.get("status")).toBe("PUBLISHED");
    expect(fd.getAll("ids")).toEqual(["q1"]);
  });

  it("nút Tạo audio gửi câu đã tích sang generateAudioAction chứ không đổi trạng thái", async () => {
    vi.mocked(setStatusAction).mockClear();
    render(<QuestionTable items={[{ ...base, section: "toeic.p2" }]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /The report/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tạo audio" }));

    await waitFor(() => expect(generateAudioAction).toHaveBeenCalled());
    const fd = vi.mocked(generateAudioAction).mock.calls[0][1];
    expect(fd.getAll("ids")).toEqual(["q1"]);
    expect(setStatusAction).not.toHaveBeenCalled();
  });

  it("chỉ hiện thông báo của nút vừa bấm", async () => {
    vi.mocked(setStatusAction).mockResolvedValueOnce("Đã đăng 1 câu.");
    vi.mocked(generateAudioAction).mockResolvedValueOnce("Đã tạo audio cho 1 mục.");
    render(<QuestionTable items={[base]} />);

    fireEvent.click(screen.getByRole("button", { name: "Đăng" }));
    expect(await screen.findByText("Đã đăng 1 câu.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tạo audio" }));
    expect(await screen.findByText("Đã tạo audio cho 1 mục.")).toBeInTheDocument();
    expect(screen.queryByText("Đã đăng 1 câu.")).not.toBeInTheDocument();
  });

  it("nhãn trạng thái đổi màu theo nháp và đã đăng", () => {
    render(<QuestionTable items={[base, { ...base, id: "q2", status: "PUBLISHED", stem: "Câu đã đăng" }]} />);

    expect(screen.getByText("Nháp")).toHaveClass("text-info");
    expect(screen.getByText("Đã đăng")).toHaveClass("text-accent");
  });

  it("cảnh báo thiếu audio cho câu Listening không có audio", () => {
    render(<QuestionTable items={[{ ...base, id: "q3", section: "toeic.p2", stem: "Câu nghe" }]} />);

    expect(screen.getByText("thiếu audio")).toBeInTheDocument();
  });

  it("không cảnh báo khi câu Listening đã có audio hoặc khi section không cần audio", () => {
    render(
      <QuestionTable
        items={[
          { ...base, id: "q4", section: "toeic.p3", hasAudio: true, stem: "Có audio" },
          { ...base, id: "q5", section: "toeic.p5", hasAudio: false, stem: "Không cần audio" },
        ]}
      />,
    );

    expect(screen.queryByText("thiếu audio")).not.toBeInTheDocument();
  });

  it("hiện tên phần thi và đáp án đúng", () => {
    render(<QuestionTable items={[base]} />);

    const dong = screen.getByRole("link", { name: /The report/ }).closest("tr")!;
    expect(within(dong).getByText("Part 5 – Hoàn thành câu")).toBeInTheDocument();
    expect(within(dong).getByText(/B\. was submitted/)).toBeInTheDocument();
  });

  it("báo khi không có câu nào", () => {
    render(<QuestionTable items={[]} />);

    expect(screen.getByText("Không có câu hỏi nào khớp bộ lọc.")).toBeInTheDocument();
  });
});
