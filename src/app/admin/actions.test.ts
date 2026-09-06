// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const findMany = vi.fn();
const updateMany = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { question: { findMany: () => findMany(), updateMany: (a: unknown) => updateMany(a) } } }));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

import { setStatusAction } from "./actions";

function form(ids: string[], status: string) {
  const fd = new FormData();
  for (const id of ids) fd.append("ids", id);
  fd.set("status", status);
  return fd;
}

describe("setStatusAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    findMany.mockReset();
    updateMany.mockReset();
    revalidatePath.mockReset();
    authMock.mockResolvedValue({ user: { id: "1", role: "ADMIN" } });
    findMany.mockResolvedValue([]);
    updateMany.mockImplementation(async (a: { where: { id: { in: string[] } } }) => ({ count: a.where.id.in.length }));
  });

  it("ném FORBIDDEN khi không phải admin", async () => {
    authMock.mockResolvedValue({ user: { id: "1", role: "USER" } });

    await expect(setStatusAction(null, form(["a"], "PUBLISHED"))).rejects.toThrow("FORBIDDEN");
    expect(updateMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("báo lỗi khi chưa chọn câu nào", async () => {
    await expect(setStatusAction(null, form([], "PUBLISHED"))).resolves.toBe("Chưa chọn câu nào.");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("từ chối status lạ thay vì mặc định gỡ", async () => {
    await expect(setStatusAction(null, form(["a", "b"], "ARCHIVED"))).resolves.toBe("Thao tác không hợp lệ.");

    const thieuStatus = new FormData();
    thieuStatus.append("ids", "a");
    await expect(setStatusAction(null, thieuStatus)).resolves.toBe("Thao tác không hợp lệ.");

    expect(findMany).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("đăng xong thì báo số câu và làm mới trang", async () => {
    findMany.mockResolvedValue([
      { id: "a", section: "toeic.p5", audioUrl: null, group: null },
      { id: "b", section: "toeic.p5", audioUrl: null, group: null },
    ]);

    await expect(setStatusAction(null, form(["a", "b"], "PUBLISHED"))).resolves.toBe("Đã đăng 2 câu.");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/questions");
  });

  it("nói rõ số câu thiếu audio không đăng được", async () => {
    findMany.mockResolvedValue([
      { id: "a", section: "toeic.p5", audioUrl: null, group: null },
      { id: "b", section: "toeic.p2", audioUrl: null, group: null },
    ]);

    await expect(setStatusAction(null, form(["a", "b"], "PUBLISHED"))).resolves.toBe(
      "Đã đăng 1 câu, 1 câu Listening thiếu audio không đăng được.",
    );
  });

  it("gỡ thì báo số câu đã gỡ", async () => {
    await expect(setStatusAction(null, form(["a", "b", "c"], "DRAFT"))).resolves.toBe("Đã gỡ 3 câu.");
    expect(updateMany).toHaveBeenCalledWith({ where: { id: { in: ["a", "b", "c"] } }, data: { status: "DRAFT" } });
  });
});
