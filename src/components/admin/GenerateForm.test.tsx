import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GenerateForm } from "./GenerateForm";
import { generateAction } from "@/app/admin/actions";

vi.mock("@/app/admin/actions", () => ({ generateAction: vi.fn() }));

describe("GenerateForm", () => {
  beforeEach(() => {
    vi.mocked(generateAction).mockReset();
    vi.mocked(generateAction).mockResolvedValue("Đã tạo 5 câu nháp");
  });

  it("gửi phần thi, kỹ năng và số câu lên action", async () => {
    render(<GenerateForm llmReady />);
    fireEvent.change(screen.getByLabelText("Phần thi"), { target: { value: "toeic.p7" } });
    fireEvent.change(screen.getByLabelText("Kỹ năng (bỏ trống để trộn nhiều kỹ năng)"), {
      target: { value: "reading.detail" },
    });
    fireEvent.change(screen.getByLabelText("Số câu (1–10)"), { target: { value: "8" } });

    fireEvent.click(screen.getByRole("button", { name: "Sinh" }));

    await waitFor(() => expect(generateAction).toHaveBeenCalled());
    const gui = vi.mocked(generateAction).mock.calls[0][1];
    expect(gui.get("section")).toBe("toeic.p7");
    expect(gui.get("skillTag")).toBe("reading.detail");
    expect(gui.get("count")).toBe("8");
  });

  it("mặc định Part 5 và 5 câu", () => {
    render(<GenerateForm llmReady />);

    expect(screen.getByLabelText("Phần thi")).toHaveValue("toeic.p5");
    expect(screen.getByLabelText("Số câu (1–10)")).toHaveValue(5);
  });

  it("cho chọn Part 2 đến 7, bỏ Part 1", () => {
    render(<GenerateForm llmReady />);

    const phanThi = screen.getByLabelText("Phần thi") as HTMLSelectElement;
    expect([...phanThi.options].map((o) => o.value)).toEqual([
      "toeic.p2",
      "toeic.p3",
      "toeic.p4",
      "toeic.p5",
      "toeic.p6",
      "toeic.p7",
    ]);
  });

  it("gợi ý danh sách kỹ năng cố định", () => {
    render(<GenerateForm llmReady />);

    const o = screen.getByLabelText("Kỹ năng (bỏ trống để trộn nhiều kỹ năng)");
    const datalist = document.getElementById(o.getAttribute("list") ?? "");
    expect(datalist?.querySelectorAll("option").length).toBeGreaterThan(5);
    expect(datalist?.querySelector('option[value="grammar.tense"]')).not.toBeNull();
  });

  it("báo đang gọi LLM và vô hiệu nút khi đang chạy", async () => {
    let ketThuc: (v: string) => void = () => {};
    vi.mocked(generateAction).mockImplementation(() => new Promise((r) => (ketThuc = r)));
    render(<GenerateForm llmReady />);
    const nut = screen.getByRole("button", { name: "Sinh" });
    fireEvent.click(nut);

    await waitFor(() => expect(nut).toBeDisabled());
    expect(screen.getByText("Đang gọi LLM, khoảng 20–40 giây…")).toBeInTheDocument();

    ketThuc("Đã tạo 5 câu nháp");
    await waitFor(() => expect(nut).not.toBeDisabled());
    expect(screen.queryByText("Đang gọi LLM, khoảng 20–40 giây…")).not.toBeInTheDocument();
  });

  it("hiện thông báo action trả về", async () => {
    render(<GenerateForm llmReady />);
    fireEvent.click(screen.getByRole("button", { name: "Sinh" }));

    expect(await screen.findByText("Đã tạo 5 câu nháp")).toBeInTheDocument();
  });

  it("chưa cấu hình LLM thì báo và khoá nút Sinh", () => {
    render(<GenerateForm llmReady={false} />);

    expect(screen.getByText("Chưa cấu hình LLM (LLM_API_KEY)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sinh" })).toBeDisabled();
  });
});
