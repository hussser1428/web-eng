// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { authMock, startDrillMock } = vi.hoisted(() => ({
  authMock: vi.fn(async (): Promise<{ user: { id: string } } | null> => ({ user: { id: "u1" } })),
  startDrillMock: vi.fn(async () => ({ attemptId: "a1", count: 10 })),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/features/attempts/start-drill", () => ({ startDrill: startDrillMock }));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://x/api/drill/start", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("POST /api/drill/start", () => {
  it("chưa đăng nhập → 401", async () => {
    authMock.mockResolvedValueOnce(null);
    expect((await POST(req({ section: "toeic.p5", count: 10 }))).status).toBe(401);
  });

  it("count không thuộc 10/20/30 → 400 INVALID", async () => {
    const res = await POST(req({ section: "toeic.p5", count: 7 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID" });
  });

  it("hợp lệ → gọi startDrill với certificate toeic, trả attemptId", async () => {
    const res = await POST(req({ section: "toeic.p5", count: 10, skillTags: ["grammar.tense"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ attemptId: "a1", count: 10 });
    expect(startDrillMock).toHaveBeenCalledWith({}, { userId: "u1", certificate: "toeic", section: "toeic.p5", skillTags: ["grammar.tense"], count: 10 });
  });

  it("NOT_ENOUGH_QUESTIONS → 409", async () => {
    startDrillMock.mockRejectedValueOnce(new Error("NOT_ENOUGH_QUESTIONS"));
    const res = await POST(req({ section: "toeic.p1", count: 10 }));
    expect(res.status).toBe(409);
  });
});
