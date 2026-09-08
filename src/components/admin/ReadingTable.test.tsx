import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReadingTable } from "./ReadingTable";
import { deleteReadingAction, setReadingStatusAction } from "@/app/admin/actions";
import type { ReadingAdminRow } from "@/features/reading/admin/list-readings-admin";

vi.mock("@/app/admin/actions", () => ({
  deleteReadingAction: vi.fn(async () => {}),
  setReadingStatusAction: vi.fn(async () => {}),
}));

function row(p: Partial<ReadingAdminRow> = {}): ReadingAdminRow {
  return {
    id: "r1",
    title: "Con cáo và chùm nho",
    genre: "FAIRY_TALE",
    level: "A2",
    status: "DRAFT",
    source: "IMPORT",
    wordCount: 27,
    sentenceCount: 3,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    ...p,
  };
}

describe("ReadingTable", () => {
  beforeEach(() => {
    vi.mocked(deleteReadingAction).mockReset();
    vi.mocked(setReadingStatusAction).mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("báo khi không có bài nào khớp bộ lọc", () => {
    render(<ReadingTable items={[]} />);
    expect(screen.getByText("Không có bài đọc nào khớp bộ lọc.")).toBeInTheDocument();
  });

  it("hiện nhãn tiếng Việt và nút Đăng cho bài nháp", () => {
    render(<ReadingTable items={[row()]} />);

    expect(screen.getByRole("link", { name: "Con cáo và chùm nho" })).toHaveAttribute("href", "/admin/readings/r1");
    expect(screen.getByText("Cổ tích")).toBeInTheDocument();
    expect(screen.getByText("Nháp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đăng" })).toBeInTheDocument();
    // Bài nháp thì /reading/[id] trả 404, nên không mời bấm Xem.
    expect(screen.queryByRole("link", { name: "Xem" })).not.toBeInTheDocument();
  });

  it("bài đã đăng có nút Gỡ và link Xem", () => {
    render(<ReadingTable items={[row({ status: "PUBLISHED" })]} />);

    expect(screen.getByRole("button", { name: "Gỡ" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem" })).toHaveAttribute("href", "/reading/r1");
  });

  it("huỷ xác nhận thì không gọi action xoá", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<ReadingTable items={[row()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Xoá" }));
    expect(deleteReadingAction).not.toHaveBeenCalled();
  });
});
