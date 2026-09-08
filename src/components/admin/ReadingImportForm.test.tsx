import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReadingImportForm } from "./ReadingImportForm";
import { importReadingAction } from "@/app/admin/actions";

vi.mock("@/app/admin/actions", () => ({ importReadingAction: vi.fn() }));

describe("ReadingImportForm", () => {
  beforeEach(() => {
    vi.mocked(importReadingAction).mockReset();
    vi.mocked(importReadingAction).mockResolvedValue({
      ok: true,
      readingId: "r1",
      sentences: 8,
      published: false,
    });
  });

  it("gửi nội dung JSON, mặc định không tích Đăng ngay", async () => {
    render(<ReadingImportForm />);
    fireEvent.change(screen.getByLabelText("Nội dung JSON"), { target: { value: '{"title":"A"}' } });
    expect(screen.getByLabelText("Đăng ngay")).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Nhập" }));

    await waitFor(() => expect(importReadingAction).toHaveBeenCalled());
    const fd = vi.mocked(importReadingAction).mock.calls[0][1];
    expect(fd.get("json")).toBe('{"title":"A"}');
    expect(fd.get("publish")).toBeNull();
  });

  it("đọc file JSON đã chọn vào ô nội dung", async () => {
    render(<ReadingImportForm />);
    const file = new File(['{"title":"B"}'], "bai.json", { type: "application/json" });

    fireEvent.change(screen.getByLabelText("Chọn file JSON"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByLabelText("Nội dung JSON")).toHaveValue('{"title":"B"}'));
  });

  it("liệt kê từng lỗi trả về từ action", async () => {
    vi.mocked(importReadingAction).mockResolvedValue({
      ok: false,
      issues: ["paragraphs.0.0.vi: Too small", "genre: Invalid option"],
    });
    render(<ReadingImportForm />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập" }));

    expect(await screen.findByText("paragraphs.0.0.vi: Too small")).toBeInTheDocument();
    expect(screen.getByText("genre: Invalid option")).toBeInTheDocument();
  });

  it("bài nháp chỉ cho link sửa, không cho link trang đọc 404", async () => {
    render(<ReadingImportForm />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập" }));

    expect(await screen.findByText("Đã nhập bài đọc 8 câu.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sửa bài" })).toHaveAttribute("href", "/admin/readings/r1");
    expect(screen.queryByRole("link", { name: "Xem bài" })).not.toBeInTheDocument();
  });

  it("đăng ngay thì có thêm link mở trang đọc", async () => {
    vi.mocked(importReadingAction).mockResolvedValue({ ok: true, readingId: "r2", sentences: 5, published: true });
    render(<ReadingImportForm />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập" }));

    expect(await screen.findByRole("link", { name: "Xem bài" })).toHaveAttribute("href", "/reading/r2");
  });
});
