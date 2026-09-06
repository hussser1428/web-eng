import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportForm } from "./ImportForm";
import { importAction } from "@/app/admin/actions";

vi.mock("@/app/admin/actions", () => ({ importAction: vi.fn() }));

describe("ImportForm", () => {
  beforeEach(() => {
    vi.mocked(importAction).mockReset();
    vi.mocked(importAction).mockResolvedValue({ ok: true, questions: 2, groups: 1, examId: null });
  });

  it("gửi nội dung JSON, mặc định không tích Đăng ngay", async () => {
    render(<ImportForm />);
    fireEvent.change(screen.getByLabelText("Nội dung JSON"), { target: { value: '{"questions":[]}' } });
    expect(screen.getByLabelText("Đăng ngay")).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Nhập" }));

    await waitFor(() => expect(importAction).toHaveBeenCalled());
    const fd = vi.mocked(importAction).mock.calls[0][1];
    expect(fd.get("json")).toBe('{"questions":[]}');
    expect(fd.get("publish")).toBeNull();
  });

  it("đọc file JSON đã chọn vào ô nội dung", async () => {
    render(<ImportForm />);
    const file = new File(['{"questions":[1]}'], "de.json", { type: "application/json" });

    fireEvent.change(screen.getByLabelText("Chọn file JSON"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByLabelText("Nội dung JSON")).toHaveValue('{"questions":[1]}'));
  });

  it("liệt kê từng lỗi trả về từ action", async () => {
    vi.mocked(importAction).mockResolvedValue({
      ok: false,
      issues: ["questions.0: answer phải nhỏ hơn số lựa chọn", "Phần thi không có trong chứng chỉ: toeic.p9."],
    });
    render(<ImportForm />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập" }));

    expect(await screen.findByText("questions.0: answer phải nhỏ hơn số lựa chọn")).toBeInTheDocument();
    expect(screen.getByText("Phần thi không có trong chứng chỉ: toeic.p9.")).toBeInTheDocument();
  });

  it("báo thành công kèm link danh sách câu hỏi và đề vừa tạo", async () => {
    vi.mocked(importAction).mockResolvedValue({ ok: true, questions: 12, groups: 2, examId: "e1" });
    render(<ImportForm />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập" }));

    expect(await screen.findByText("Đã nhập 12 câu và 2 nhóm.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem danh sách câu hỏi" })).toHaveAttribute("href", "/admin/questions");
    expect(screen.getByRole("link", { name: "Mở đề vừa tạo" })).toHaveAttribute("href", "/exam/e1");
  });

  it("không hiện link đề khi không tạo đề", async () => {
    render(<ImportForm />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập" }));

    expect(await screen.findByText("Đã nhập 2 câu và 1 nhóm.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mở đề vừa tạo" })).not.toBeInTheDocument();
  });

  it("vô hiệu nút Nhập khi đang gửi", async () => {
    let ketThuc: (v: { ok: true; questions: number; groups: number; examId: string | null }) => void = () => {};
    vi.mocked(importAction).mockImplementation(() => new Promise((r) => (ketThuc = r)));
    render(<ImportForm />);
    const nut = screen.getByRole("button", { name: "Nhập" });
    fireEvent.click(nut);

    await waitFor(() => expect(nut).toBeDisabled());
    ketThuc({ ok: true, questions: 1, groups: 0, examId: null });
    await waitFor(() => expect(nut).not.toBeDisabled());
  });
});
