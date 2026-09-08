// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdmin } from "@/lib/require-admin";

// Chặn ngay ở `requireAdmin`: nếu trang gọi trước khi đụng dữ liệu thì lời gọi trang phải ném REDIRECT.
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: vi.fn(async () => {
    throw new Error("REDIRECT");
  }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/providers/llm", () => ({ getLlmProvider: () => null }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));

type Trang = (props: never) => Promise<unknown>;

const TRANG: Array<{ ten: string; nap: () => Promise<{ default: Trang }>; props: unknown }> = [
  { ten: "/admin", nap: () => import("./page"), props: {} },
  { ten: "/admin/questions", nap: () => import("./questions/page"), props: { searchParams: Promise.resolve({}) } },
  { ten: "/admin/questions/[id]", nap: () => import("./questions/[id]/page"), props: { params: Promise.resolve({ id: "x" }) } },
  { ten: "/admin/import", nap: () => import("./import/page"), props: {} },
  { ten: "/admin/exams", nap: () => import("./exams/page"), props: {} },
  { ten: "/admin/generate", nap: () => import("./generate/page"), props: {} },
  { ten: "/admin/readings/import", nap: () => import("./readings/import/page"), props: {} },
  { ten: "/admin/readings/generate", nap: () => import("./readings/generate/page"), props: {} },
];

describe("mọi trang /admin tự gọi requireAdmin", () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockClear();
  });

  for (const { ten, nap, props } of TRANG) {
    it(`${ten} chặn người không phải admin`, async () => {
      const { default: Trang } = await nap();

      await expect(Trang(props as never)).rejects.toThrow("REDIRECT");
      expect(requireAdmin).toHaveBeenCalled();
    });
  }
});
