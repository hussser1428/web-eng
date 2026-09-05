import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VocabList } from "./VocabList";

const { pushMock, refreshMock } = vi.hoisted(() => ({ pushMock: vi.fn(), refreshMock: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));

const NOW = "2026-09-05T00:00:00.000Z";

const TU = {
  wordId: "w1",
  headword: "apple",
  phonetic: "/ˈæp.əl/",
  pos: "n",
  meaningVi: "quả táo",
  sourceContext: "I ate an apple.",
  dueAt: "2026-09-08T00:00:00.000Z",
};

beforeEach(() => {
  pushMock.mockClear();
  refreshMock.mockClear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ removed: true }), { status: 200 })));
});

describe("VocabList", () => {
  it("hiện từ, nghĩa, phiên âm và hạn ôn", () => {
    render(<VocabList items={[TU]} total={1} page={1} pageSize={20} q="" now={NOW} />);
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.getByText("quả táo")).toBeInTheDocument();
    expect(screen.getByText("/ˈæp.əl/")).toBeInTheDocument();
    expect(screen.getByText("Còn 3 ngày")).toBeInTheDocument();
  });

  it("chưa lưu từ nào thì hướng dẫn cách lưu", () => {
    render(<VocabList items={[]} total={0} page={1} pageSize={20} q="" now={NOW} />);
    expect(screen.getByText(/Bôi đen một từ tiếng Anh/)).toBeInTheDocument();
  });

  it("tìm kiếm đẩy từ khoá lên URL", async () => {
    const user = userEvent.setup();
    render(<VocabList items={[TU]} total={1} page={1} pageSize={20} q="" now={NOW} />);
    await user.type(screen.getByLabelText("Tìm từ đã lưu"), "táo");
    await user.click(screen.getByRole("button", { name: "Tìm" }));
    expect(pushMock).toHaveBeenCalledWith(`/vocab?q=${encodeURIComponent("táo")}`);
  });

  it("xoá từ thì gọi API rồi làm mới danh sách", async () => {
    const user = userEvent.setup();
    render(<VocabList items={[TU]} total={1} page={1} pageSize={20} q="" now={NOW} />);
    await user.click(screen.getByRole("button", { name: "Xoá từ apple" }));
    expect(fetch).toHaveBeenCalledWith("/api/vocab/saved/w1", { method: "DELETE" });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("chỉ một trang thì không hiện nút chuyển trang", () => {
    render(<VocabList items={[TU]} total={1} page={1} pageSize={20} q="" now={NOW} />);
    expect(screen.queryByRole("button", { name: "Trang sau" })).not.toBeInTheDocument();
  });

  it("nhiều trang thì chuyển trang giữ nguyên từ khoá tìm", async () => {
    const user = userEvent.setup();
    render(<VocabList items={[TU]} total={45} page={2} pageSize={20} q="táo" now={NOW} />);
    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(pushMock).toHaveBeenCalledWith(`/vocab?q=${encodeURIComponent("táo")}&page=3`);
  });
});
