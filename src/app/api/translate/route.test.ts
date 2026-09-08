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

import { auth } from "@/lib/auth";
import { POST } from "./route";

function req(body: unknown, ip = "1.2.3.4") {
  return new Request("http://x/api/translate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
  });
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

  it("429 khi khách vượt quá 30 lượt/phút từ cùng một IP", async () => {
    vi.mocked(auth).mockResolvedValue(null as never); // khách: khoá theo IP
    const ip = "9.9.9.9"; // IP riêng vì limiter là singleton cấp module, dùng chung giữa các test
    for (let i = 0; i < 30; i++) {
      expect((await POST(req({ text: "hello world" }, ip))).status).toBe(200);
    }
    expect((await POST(req({ text: "hello world" }, ip))).status).toBe(429);
    // Cùng IP nhưng đã đăng nhập thì khoá theo tài khoản, không bị vạ lây
    vi.mocked(auth).mockResolvedValue({ user: { id: "u-khac", role: "USER" } } as never);
    expect((await POST(req({ text: "hello world" }, ip))).status).toBe(200);
  });
});
