import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuestionForm } from "./QuestionForm";
import { updateQuestionAction } from "@/app/admin/actions";

vi.mock("@/app/admin/actions", () => ({ updateQuestionAction: vi.fn(async () => null) }));

const cauHoi = {
  id: "q1",
  stem: "The report ___ yesterday.",
  choices: ["submit", "was submitted", "submitting", "submits"],
  answer: 1,
  explanation: "Câu bị động thì quá khứ.",
  skillTags: ["bị động", "thì"],
  audioUrl: null,
  imageUrl: null,
  transcript: null,
  group: null,
};

describe("QuestionForm", () => {
  beforeEach(() => {
    vi.mocked(updateQuestionAction).mockReset();
    vi.mocked(updateQuestionAction).mockResolvedValue(null);
  });

  it("điền sẵn dữ liệu câu hỏi và tích sẵn đáp án đúng", () => {
    render(<QuestionForm question={cauHoi} choiceCount={4} />);

    expect(screen.getByLabelText("Đề bài")).toHaveValue("The report ___ yesterday.");
    expect(screen.getByLabelText("Lựa chọn B")).toHaveValue("was submitted");
    expect(screen.getByLabelText("Chọn B làm đáp án")).toBeChecked();
    expect(screen.getByLabelText("Giải thích")).toHaveValue("Câu bị động thì quá khứ.");
    expect(screen.getByLabelText(/Nhãn kỹ năng/)).toHaveValue("bị động, thì");
  });

  it("hiện đúng số ô lựa chọn theo phần thi, không cho thêm bớt", () => {
    render(<QuestionForm question={{ ...cauHoi, choices: ["a", "b", "c"], answer: 0 }} choiceCount={3} />);

    expect(screen.getAllByLabelText(/^Lựa chọn /)).toHaveLength(3);
    expect(screen.queryByLabelText("Lựa chọn D")).not.toBeInTheDocument();
  });

  it("hiện đoạn văn và transcript của nhóm ở dạng chỉ đọc", () => {
    render(
      <QuestionForm
        question={{ ...cauHoi, group: { passage: "Dear Mr. Lee,", transcript: "M: Good morning." } }}
        choiceCount={4}
      />,
    );

    expect(screen.getByText("Dear Mr. Lee,")).toBeInTheDocument();
    expect(screen.getByText("M: Good morning.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Đoạn văn của nhóm")).not.toBeInTheDocument();
  });

  it("gửi id, lựa chọn và nhãn kỹ năng lên action", async () => {
    render(<QuestionForm question={cauHoi} choiceCount={4} />);
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(updateQuestionAction).toHaveBeenCalled());
    const fd = vi.mocked(updateQuestionAction).mock.calls[0][1];
    expect(fd.get("id")).toBe("q1");
    expect(fd.getAll("choices")).toEqual(["submit", "was submitted", "submitting", "submits"]);
    expect(fd.get("answer")).toBe("1");
    expect(fd.get("skillTags")).toBe("bị động, thì");
  });

  it("hiện lỗi trả về từ action", async () => {
    vi.mocked(updateQuestionAction).mockResolvedValue("Số lựa chọn không khớp phần thi.");
    render(<QuestionForm question={cauHoi} choiceCount={4} />);
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    expect(await screen.findByText("Số lựa chọn không khớp phần thi.")).toBeInTheDocument();
  });

  it("vô hiệu nút Lưu khi đang gửi", async () => {
    let ketThuc: (v: string | null) => void = () => {};
    vi.mocked(updateQuestionAction).mockImplementation(() => new Promise((r) => (ketThuc = r)));
    render(<QuestionForm question={cauHoi} choiceCount={4} />);
    const nut = screen.getByRole("button", { name: "Lưu" });
    fireEvent.click(nut);

    await waitFor(() => expect(nut).toBeDisabled());
    ketThuc(null);
    await waitFor(() => expect(nut).not.toBeDisabled());
  });
});
