// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(async (): Promise<{ user: { id: string; role: string } } | null> => ({
    user: { id: "u1", role: "USER" },
  })),
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/features/vocab/save-word", () => ({
  saveWord: vi.fn(async () => {
    throw { code: "P2003" };
  }),
}));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://x/api/vocab/save", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("POST /api/vocab/save", () => {
  it("wordId không tồn tại (P2003) thì trả 404 WORD_NOT_FOUND", async () => {
    const res = await POST(req({ wordId: "unknown" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "WORD_NOT_FOUND" });
  });

  it("chưa đăng nhập thì trả 401", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await POST(req({ wordId: "w1" }));
    expect(res.status).toBe(401);
  });
});
