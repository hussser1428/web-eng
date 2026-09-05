// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { authMock, answerMock } = vi.hoisted(() => ({
  authMock: vi.fn(async (): Promise<{ user: { id: string; role: string } } | null> => ({ user: { id: "u1", role: "USER" } })),
  answerMock: vi.fn(async () => ({
    isCorrect: true,
    correctText: "quả táo",
    dueAt: new Date("2026-09-20T00:00:00.000Z"),
  })),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/features/vocab/answer-quiz", () => ({ answerQuizWord: answerMock }));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://x/api/vocab/quiz", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("POST /api/vocab/quiz", () => {
  it("chấm câu trắc nghiệm và trả đáp án đúng cho client hiện ra", async () => {
    const res = await POST(req({ wordId: "w1", chosen: "quả táo", direction: "EN_TO_VI" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      isCorrect: true,
      correctText: "quả táo",
      dueAt: "2026-09-20T00:00:00.000Z",
    });
    expect(answerMock).toHaveBeenCalledWith({}, { userId: "u1", wordId: "w1", chosen: "quả táo", direction: "EN_TO_VI" });
  });

  it("chiều dịch lạ thì trả 400", async () => {
    const res = await POST(req({ wordId: "w1", chosen: "quả táo", direction: "EN_TO_JP" }));
    expect(res.status).toBe(400);
  });

  it("chuỗi chọn rỗng thì trả 400", async () => {
    const res = await POST(req({ wordId: "w1", chosen: "", direction: "EN_TO_VI" }));
    expect(res.status).toBe(400);
  });

  it("chưa đăng nhập thì trả 401", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await POST(req({ wordId: "w1", chosen: "quả táo", direction: "EN_TO_VI" }));
    expect(res.status).toBe(401);
  });
});
