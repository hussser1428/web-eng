// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { authMock, reviewWordMock } = vi.hoisted(() => ({
  authMock: vi.fn(async (): Promise<{ user: { id: string; role: string } } | null> => ({ user: { id: "u1", role: "USER" } })),
  reviewWordMock: vi.fn(async () => ({ intervalDays: 1, dueAt: new Date("2026-09-06T00:00:00.000Z"), early: false })),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/features/vocab/review-word", () => ({ reviewWord: reviewWordMock }));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://x/api/vocab/review", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("POST /api/vocab/review", () => {
  it("chấm thẻ dễ thì gọi SM-2 với chất lượng 5 và trả lịch mới", async () => {
    const res = await POST(req({ wordId: "w1", grade: "EASY" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ dueAt: "2026-09-06T00:00:00.000Z", intervalDays: 1, early: false });
    expect(reviewWordMock).toHaveBeenCalledWith({}, { userId: "u1", wordId: "w1", quality: 5 });
  });

  it("chấm quên thì dùng chất lượng 1", async () => {
    await POST(req({ wordId: "w1", grade: "FORGOT" }));
    expect(reviewWordMock).toHaveBeenLastCalledWith({}, { userId: "u1", wordId: "w1", quality: 1 });
  });

  it("mức đánh giá lạ thì trả 400", async () => {
    const res = await POST(req({ wordId: "w1", grade: "SIEU_DE" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID" });
  });

  it("chưa đăng nhập thì trả 401", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await POST(req({ wordId: "w1", grade: "EASY" }));
    expect(res.status).toBe(401);
  });

  it("chưa lưu từ đó thì trả 404", async () => {
    reviewWordMock.mockRejectedValueOnce(new Error("NOT_FOUND"));
    const res = await POST(req({ wordId: "w1", grade: "EASY" }));
    expect(res.status).toBe(404);
  });
});
