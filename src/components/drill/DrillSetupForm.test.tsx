import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DrillSetupForm } from "./DrillSetupForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const sections = [{ id: "toeic.p5", name: "Part 5 – Hoàn thành câu" }, { id: "toeic.p7", name: "Part 7 – Đọc hiểu" }];

describe("DrillSetupForm", () => {
  beforeEach(() => { push.mockReset(); vi.restoreAllMocks(); });

  it("gửi section và count đã chọn rồi chuyển sang trang drill", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ attemptId: "a1", count: 10 }), { status: 200 }));
    render(<DrillSetupForm sections={sections} />);
    await userEvent.click(screen.getByRole("radio", { name: /Part 7/ }));
    await userEvent.click(screen.getByRole("radio", { name: "20 câu" }));
    await userEvent.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/drill/a1"));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({ section: "toeic.p7", count: 20 });
  });

  it("NOT_ENOUGH_QUESTIONS → báo chưa có câu hỏi", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "NOT_ENOUGH_QUESTIONS" }), { status: 409 }));
    render(<DrillSetupForm sections={sections} />);
    await userEvent.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    expect(await screen.findByText(/chưa có câu hỏi/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("có defaultSection và defaultTag → chọn sẵn phần đó và gửi kèm kỹ năng", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ attemptId: "a9", count: 10 }), { status: 200 }));
    render(<DrillSetupForm sections={sections} defaultSection="toeic.p7" defaultTag="suy luận" />);
    expect(screen.getByRole("radio", { name: /Part 7/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/drill/a9"));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ section: "toeic.p7", count: 10, skillTags: ["suy luận"] });
  });

  it("bỏ lọc kỹ năng thì không gửi skillTags nữa", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ attemptId: "a9", count: 10 }), { status: 200 }));
    render(<DrillSetupForm sections={sections} defaultSection="toeic.p7" defaultTag="suy luận" />);
    await userEvent.click(screen.getByRole("button", { name: "Bỏ lọc kỹ năng" }));
    await userEvent.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ section: "toeic.p7", count: 10 });
  });

  it("defaultSection không có trong danh sách thì rơi về phần đầu tiên", () => {
    render(<DrillSetupForm sections={sections} defaultSection="toeic.p99" />);
    expect(screen.getByRole("radio", { name: /Part 5/ })).toHaveAttribute("aria-checked", "true");
  });
});
