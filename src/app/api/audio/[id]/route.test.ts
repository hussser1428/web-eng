// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { audioFile: { findUnique: vi.fn() } } }));

import { prisma } from "@/lib/prisma";
import { GET } from "./route";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/audio/[id]", () => {
  it("404 khi không tìm thấy", async () => {
    vi.mocked(prisma.audioFile.findUnique).mockResolvedValueOnce(null as never);
    const res = await GET(new Request("http://x"), ctx("nope"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NOT_FOUND" });
  });

  it("trả bytes kèm header đúng khi tìm thấy", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    vi.mocked(prisma.audioFile.findUnique).mockResolvedValueOnce({ id: "a1", mime: "audio/mpeg", bytes, createdAt: new Date() } as never);
    const res = await GET(new Request("http://x"), ctx("a1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(res.headers.get("Content-Length")).toBe("3");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });
});
