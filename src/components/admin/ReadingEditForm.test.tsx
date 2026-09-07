import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReadingEditForm } from "./ReadingEditForm";
import { updateReadingAction } from "@/app/admin/actions";
import type { ReadingAdminDetail } from "@/features/reading/admin/get-reading-admin";

vi.mock("@/app/admin/actions", () => ({ updateReadingAction: vi.fn(async () => null) }));

const bai: ReadingAdminDetail = {
  id: "r1",
  title: "Con cáo và chùm nho",
  genre: "FAIRY_TALE",
  level: "A2",
  sourceName: "Aesop",
  sourceUrl: null,
  license: "Public domain",
  wordCount: 10,
  status: "DRAFT",
  source: "IMPORT",
  paragraphs: [
    [
      { order: 1, en: "A fox saw grapes.", vi: "Cáo thấy nho." },
      { order: 2, en: "They were high up.", vi: "Chúng ở trên cao." },
    ],
    [{ order: 3, en: "He walked away.", vi: "Nó bỏ đi." }],
  ],
};

function guiForm() {
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
}

describe("ReadingEditForm", () => {
  beforeEach(() => {
    vi.mocked(updateReadingAction).mockReset();
    vi.mocked(updateReadingAction).mockResolvedValue(null);
  });

  it("điền sẵn thông tin bài và từng câu", () => {
    render(<ReadingEditForm reading={bai} />);

    expect(screen.getByLabelText("Tiêu đề")).toHaveValue("Con cáo và chùm nho");
    expect(screen.getByLabelText("Giấy phép")).toHaveValue("Public domain");
    expect(screen.getByLabelText("Đoạn 1 câu 2 tiếng Anh")).toHaveValue("They were high up.");
    expect(screen.getByLabelText("Đoạn 2 câu 1 tiếng Việt")).toHaveValue("Nó bỏ đi.");
  });

  it("thêm và xoá câu", () => {
    render(<ReadingEditForm reading={bai} />);

    fireEvent.click(screen.getByLabelText("Thêm câu vào đoạn 2"));
    expect(screen.getByLabelText("Đoạn 2 câu 2 tiếng Anh")).toHaveValue("");

    fireEvent.click(screen.getByLabelText("Xoá câu 1 của đoạn 1"));
    // Câu thứ hai của đoạn 1 dồn lên thành câu 1.
    expect(screen.getByLabelText("Đoạn 1 câu 1 tiếng Anh")).toHaveValue("They were high up.");
    expect(screen.queryByLabelText("Đoạn 1 câu 2 tiếng Anh")).not.toBeInTheDocument();
  });

  it("thêm và xoá đoạn", () => {
    render(<ReadingEditForm reading={bai} />);

    fireEvent.click(screen.getByRole("button", { name: "Thêm đoạn" }));
    expect(screen.getByLabelText("Đoạn 3 câu 1 tiếng Anh")).toHaveValue("");

    fireEvent.click(screen.getByLabelText("Xoá đoạn 1"));
    expect(screen.getByLabelText("Đoạn 1 câu 1 tiếng Anh")).toHaveValue("He walked away.");
  });

  it("đóng gói paragraphs thành JSON khi gửi", async () => {
    render(<ReadingEditForm reading={bai} />);
    fireEvent.change(screen.getByLabelText("Đoạn 2 câu 1 tiếng Việt"), { target: { value: "Nó đi mất." } });
    guiForm();

    await waitFor(() => expect(updateReadingAction).toHaveBeenCalled());
    const fd = vi.mocked(updateReadingAction).mock.calls[0][1];
    expect(fd.get("id")).toBe("r1");
    expect(fd.get("title")).toBe("Con cáo và chùm nho");
    expect(JSON.parse(String(fd.get("paragraphs")))).toEqual([
      [
        { en: "A fox saw grapes.", vi: "Cáo thấy nho." },
        { en: "They were high up.", vi: "Chúng ở trên cao." },
      ],
      [{ en: "He walked away.", vi: "Nó đi mất." }],
    ]);
  });

  it("hiện lỗi trả về từ action", async () => {
    vi.mocked(updateReadingAction).mockResolvedValue("Không tìm thấy bài đọc.");
    render(<ReadingEditForm reading={bai} />);
    guiForm();

    expect(await screen.findByText("Không tìm thấy bài đọc.")).toBeInTheDocument();
  });
});
