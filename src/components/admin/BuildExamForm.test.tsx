import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BuildExamForm } from "./BuildExamForm";
import { buildExamAction } from "@/app/admin/actions";

vi.mock("@/app/admin/actions", () => ({ buildExamAction: vi.fn() }));

describe("BuildExamForm", () => {
  beforeEach(() => {
    vi.mocked(buildExamAction).mockReset();
    vi.mocked(buildExamAction).mockResolvedValue({ ok: true, examId: "e1" });
  });

  it("gửi tên đề lên action", async () => {
    render(<BuildExamForm />);
    fireEvent.change(screen.getByLabelText("Tên đề"), { target: { value: "Đề TOEIC số 1" } });

    fireEvent.click(screen.getByRole("button", { name: "Ghép tự động" }));

    await waitFor(() => expect(buildExamAction).toHaveBeenCalled());
    expect(vi.mocked(buildExamAction).mock.calls[0][1].get("title")).toBe("Đề TOEIC số 1");
  });

  it("báo ghép xong nhưng không mời mở đề nháp", async () => {
    render(<BuildExamForm />);
    fireEvent.click(screen.getByRole("button", { name: "Ghép tự động" }));

    expect(await screen.findByText("Đã ghép xong đề mới, đang ở trạng thái nháp.")).toBeInTheDocument();
    expect(screen.getByText("Đã tạo đề nháp — đăng ở bảng bên dưới rồi mới mở được.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("hiện bảng Part còn thiếu bao nhiêu câu", async () => {
    vi.mocked(buildExamAction).mockResolvedValue({
      ok: false,
      message: "Chưa đủ câu đã đăng để ghép đề.",
      shortage: [
        { section: "toeic.p5", name: "Part 5 – Hoàn thành câu", need: 30, have: 20 },
        { section: "toeic.p7", name: "Part 7 – Đọc hiểu", need: 54, have: 0 },
      ],
    });
    render(<BuildExamForm />);
    fireEvent.click(screen.getByRole("button", { name: "Ghép tự động" }));

    expect(await screen.findByText("Chưa đủ câu đã đăng để ghép đề.")).toBeInTheDocument();
    const dong = screen.getByText("Part 5 – Hoàn thành câu").closest("tr");
    expect(dong).not.toBeNull();
    expect(dong).toHaveTextContent("30");
    expect(dong).toHaveTextContent("20");
    expect(screen.getByText("Part 7 – Đọc hiểu")).toBeInTheDocument();
  });

  it("chỉ hiện thông báo khi lỗi không kèm bảng thiếu", async () => {
    vi.mocked(buildExamAction).mockResolvedValue({ ok: false, message: "Nhập tên đề." });
    render(<BuildExamForm />);
    fireEvent.click(screen.getByRole("button", { name: "Ghép tự động" }));

    expect(await screen.findByText("Nhập tên đề.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("vô hiệu nút khi đang ghép", async () => {
    let ketThuc: (v: { ok: true; examId: string }) => void = () => {};
    vi.mocked(buildExamAction).mockImplementation(() => new Promise((r) => (ketThuc = r)));
    render(<BuildExamForm />);
    const nut = screen.getByRole("button", { name: "Ghép tự động" });
    fireEvent.click(nut);

    await waitFor(() => expect(nut).toBeDisabled());
    ketThuc({ ok: true, examId: "e1" });
    await waitFor(() => expect(nut).not.toBeDisabled());
  });
});
