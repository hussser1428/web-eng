import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReadingGenerateForm } from "./ReadingGenerateForm";
import { generateReadingAction } from "@/app/admin/actions";

vi.mock("@/app/admin/actions", () => ({ generateReadingAction: vi.fn() }));

describe("ReadingGenerateForm", () => {
  beforeEach(() => {
    vi.mocked(generateReadingAction).mockReset();
    vi.mocked(generateReadingAction).mockResolvedValue("Đã tạo bài nháp: The Cat");
  });

  it("gửi thể loại, độ khó, độ dài và chủ đề", async () => {
    render(<ReadingGenerateForm llmReady />);
    fireEvent.change(screen.getByLabelText("Thể loại"), { target: { value: "NEWS" } });
    fireEvent.change(screen.getByLabelText("Độ khó"), { target: { value: "B2" } });
    fireEvent.change(screen.getByLabelText("Độ dài"), { target: { value: "long" } });
    fireEvent.change(screen.getByLabelText("Chủ đề (bỏ trống để AI tự chọn)"), { target: { value: "chợ đêm" } });

    fireEvent.click(screen.getByRole("button", { name: "Sinh" }));

    await waitFor(() => expect(generateReadingAction).toHaveBeenCalled());
    const fd = vi.mocked(generateReadingAction).mock.calls[0][1];
    expect(fd.get("genre")).toBe("NEWS");
    expect(fd.get("level")).toBe("B2");
    expect(fd.get("length")).toBe("long");
    expect(fd.get("topic")).toBe("chợ đêm");
  });

  it("chưa cấu hình LLM thì khoá nút Sinh", () => {
    render(<ReadingGenerateForm llmReady={false} />);

    expect(screen.getByRole("button", { name: "Sinh" })).toBeDisabled();
    expect(screen.getByText("Chưa cấu hình LLM (LLM_API_KEY)")).toBeInTheDocument();
  });

  it("hiện thông báo thành công của action", async () => {
    render(<ReadingGenerateForm llmReady />);
    fireEvent.click(screen.getByRole("button", { name: "Sinh" }));

    expect(await screen.findByText("Đã tạo bài nháp: The Cat")).toBeInTheDocument();
  });

  it("hiện lỗi của action bằng màu cảnh báo", async () => {
    vi.mocked(generateReadingAction).mockResolvedValue("Hết hạn mức, thử lại sau vài phút");
    render(<ReadingGenerateForm llmReady />);
    fireEvent.click(screen.getByRole("button", { name: "Sinh" }));

    expect(await screen.findByText("Hết hạn mức, thử lại sau vài phút")).toHaveClass("text-danger");
  });
});
