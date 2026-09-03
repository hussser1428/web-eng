// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1", role: "USER" } })) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/providers/translate", () => ({ getTranslateProvider: () => ({ translate: vi.fn() }) }));
vi.mock("@/features/translate/translate", async (orig) => {
  const mod = await orig<typeof import("@/features/translate/translate")>();
  return {
    ...mod,
    translateText: vi.fn(async (_deps: unknown, text: string) => {
      if (!text.trim()) throw new Error("EMPTY");
      if (text.length > 500) throw new Error("TEXT_TOO_LONG");
      return { kind: "text", from: "en", to: "vi", result: "ok" };
    }),
  };
});

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://x/api/translate", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

describe("POST /api/translate", () => {
  it("trả kết quả và canSave=true khi đã đăng nhập", async () => {
    const res = await POST(req({ text: "hello world" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ kind: "text", from: "en", to: "vi", result: "ok", canSave: true });
  });
  it("400 khi rỗng", async () => {
    expect((await POST(req({ text: "  " }))).status).toBe(400);
  });
  it("400 khi quá dài", async () => {
    expect((await POST(req({ text: "a".repeat(501) }))).status).toBe(400);
  });
  it("400 khi body sai", async () => {
    expect((await POST(req({ nope: 1 }))).status).toBe(400);
  });
});
