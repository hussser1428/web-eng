// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirectMock(url) }));

import { requireAdmin } from "./require-admin";

describe("requireAdmin", () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
  });

  it("chuyển về trang chủ khi chưa đăng nhập", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("chuyển về trang chủ khi là USER", async () => {
    authMock.mockResolvedValue({ user: { id: "1", role: "USER" } });
    await expect(requireAdmin()).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("ném FORBIDDEN ở chế độ action", async () => {
    authMock.mockResolvedValue({ user: { id: "1", role: "USER" } });
    await expect(requireAdmin("action")).rejects.toThrow("FORBIDDEN");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("trả id khi là ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "42", role: "ADMIN" } });
    await expect(requireAdmin()).resolves.toEqual({ id: "42" });
  });
});
